/**
 * Lima server — the minimal backend. Everything degrades gracefully:
 *   - no ANTHROPIC_API_KEY → /api/chat answers in clearly-labeled demo mode
 *   - no AT_* keys         → SMS logs in simulation mode
 *   - no VAPID keys        → web push disabled, SMS/simulation still works
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  upsertUser, loadUsers, getConversation, appendMessage, resetConversation,
  getProfile, saveProfile, addEscalation,
} from './store.js';
import { sendSMS, smsMode, handleIncomingSms } from './sms.js';
import { sendWhatsApp, whatsappMode, fetchTwilioMedia, normalizePhone } from './whatsapp.js';
import { aiMode, aiModel, aiChat, aiVision, transcribeAudio, extractProfile } from './ai.js';
import { isPriceQuery, detectCrop, priceContext } from './prices.js';
import { initPush, runAlertSweep, startAlertScheduler, rain48h } from './alerts.js';

const PORT = process.env.PORT ?? 8790;

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' })); // room for one compressed plant photo
app.use(express.urlencoded({ extended: true })); // Africa's Talking callbacks

/* ----------------------------------------------------- AI (Groq) */
const DEMO_REPLY =
  'Sample answer (server demo mode): water deeply every 3–4 days rather than a little every day, early in the morning. Add GROQ_API_KEY to server/.env for live answers.';

app.post('/api/chat', async (req, res) => {
  try {
    const { system, messages } = req.body ?? {};
    if (aiMode() === 'demo') return res.json({ text: DEMO_REPLY, demo: true });
    const text = await aiChat({
      system: system ?? 'You are a helpful farming assistant.',
      messages: Array.isArray(messages) ? messages : [],
    });
    res.json({ text, demo: false });
  } catch (e) {
    console.error('[chat]', e.message);
    res.status(500).json({ error: 'chat_failed', detail: e.message });
  }
});

app.post('/api/diagnose', async (req, res) => {
  try {
    const { system, image, mediaType, prompt } = req.body ?? {};
    if (aiMode() === 'demo')
      return res.json({
        text: 'Sample diagnosis (server demo mode): looks like early blight — remove affected leaves, avoid wetting foliage, consider a copper spray. Add GROQ_API_KEY for real analysis.',
        demo: true,
      });
    const text = await aiVision({ system, image, mediaType, prompt: prompt ?? 'Diagnose this plant.' });
    res.json({ text, demo: false });
  } catch (e) {
    console.error('[diagnose]', e.message);
    res.status(500).json({ error: 'diagnose_failed', detail: e.message });
  }
});

/* ------------------------------------------------------------- Alerts */
const WELCOME_MESSAGE =
  "Hello! I'm Lima, your personal AI farming assistant. To help you best, I'll ask a few quick questions. First — what's your name?";

app.post('/api/alerts/optin', async (req, res) => {
  const { phone, optIn, lat, lon, language, subscription } = req.body ?? {};
  if (!phone && !subscription) return res.status(400).json({ error: 'phone_or_subscription_required' });
  // Normalize so the profile key matches the WhatsApp handler (which uses
  // normalizePhone(From)). The conversation store is keyed by "whatsapp:<num>".
  const normPhone = phone ? normalizePhone(phone) : '';
  const convKey = normPhone ? `whatsapp:${normPhone}` : '';
  upsertUser({ phone: normPhone || undefined, optIn: !!optIn, lat, lon, language, subscription });
  console.log(`[alerts] opt-${optIn ? 'in' : 'out'}: ${normPhone || 'push-only'}`);

  // Welcome the farmer on WhatsApp right away so they can see it works
  // (and have a chat thread to reply into).
  if (optIn && normPhone) {
    try {
      const result = await sendWhatsApp(normPhone, WELCOME_MESSAGE);
      // Seed the conversation so the farmer's reply continues the intake.
      resetConversation(convKey);
      appendMessage(convKey, 'assistant', WELCOME_MESSAGE);
      return res.json({
        ok: true,
        whatsapp: result.simulated ? 'simulated' : 'sent',
        smsMode: smsMode(),
      });
    } catch (e) {
      console.error('[alerts] welcome WhatsApp failed:', e.message);
      return res.status(502).json({ ok: false, error: e.message });
    }
  }
  res.json({ ok: true, smsMode: smsMode() });
});

app.get('/api/push/vapidPublicKey', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
});

app.post('/api/alerts/run', async (_req, res) => {
  const result = await runAlertSweep(true);
  res.json(result);
});

/* ------------------------------------- WhatsApp incoming (Twilio) ---- */
// Point the Twilio WhatsApp sandbox "When a message comes in" webhook here
// (needs a public URL, e.g. ngrok: https://xxxx.ngrok-free.app/api/whatsapp/incoming).
// Handles: text chat, plant-photo diagnosis, voice notes, market prices,
// per-farmer memory, and handoff to a human extension officer.
const xmlEscape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const twiml = (res, message) =>
  res
    .type('text/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(message)}</Message></Response>`);

const escalationRequested = (t) =>
  /\b(human|real person|agent|officer|extension officer|expert|vet|talk to (a|someone)|speak to (a|someone))\b/i.test(t);

// Build a system prompt whose intake adapts to what we ALREADY know about the
// farmer, so returning farmers are never re-asked their name/crop/location.
function buildSystem(profile, extra) {
  const base = `You are Lima, a friendly farming assistant for smallholder farmers, chatting on WhatsApp.

Rules:
- Keep every message short (1-3 sentences) — this is WhatsApp. Ask only ONE question per message.
- Reply in the language the farmer uses. Give clear, practical, low-cost advice.
- If a question needs a local extension officer or vet, say so plainly.`;

  const known = [];
  if (profile.name) known.push(`name: ${profile.name}`);
  if (profile.crop) known.push(`crop: ${profile.crop}`);
  if (profile.location) known.push(`location: ${profile.location}`);

  const missing = [];
  if (!profile.name) missing.push('their name');
  if (!profile.crop) missing.push('which crop they farm');
  if (!profile.location) missing.push('where their farm is (town/area)');

  let intake = '';
  if (known.length) intake += `\n\nYou already know this farmer — ${known.join(', ')}. Greet them by name and do NOT ask these again.`;
  if (missing.length) {
    intake += `\n\nBefore giving detailed advice, collect the missing details, ONE question per message, only asking about: ${missing.join(', ')}. Then ask what problem they have.`;
  } else {
    intake += `\n\nYou have all their details — skip intake and help them directly.`;
  }

  let s = base + intake;
  if (extra) s += `\n\n${extra}`;
  return s;
}

app.post('/api/whatsapp/incoming', async (req, res) => {
  const from = req.body?.From ?? '';
  const key = normalizePhone(from);
  let text = (req.body?.Body ?? '').trim();
  const numMedia = parseInt(req.body?.NumMedia ?? '0', 10) || 0;
  const mediaUrl = req.body?.MediaUrl0;
  const mediaType = req.body?.MediaContentType0 || '';
  console.log(`[whatsapp in] ${from}: ${text}${numMedia ? ` [+${numMedia} media: ${mediaType}]` : ''}`);

  // Let a farmer start over.
  if (/^(reset|restart|start over)$/i.test(text)) {
    resetConversation(from);
    return twiml(res, "Okay, let's start over. Hello! I'm Lima, your farming assistant. What's your name?");
  }

  if (aiMode() === 'demo') return twiml(res, DEMO_REPLY);

  const profile = getProfile(key);
  let reply;
  let logText = text; // what we store in history for this turn

  try {
    // 1) Plant-photo diagnosis
    if (numMedia > 0 && mediaType.startsWith('image/')) {
      const { buf } = await fetchTwilioMedia(mediaUrl);
      reply = await aiVision({
        system: buildSystem(profile) +
          '\n\nThe farmer sent a photo of a plant. Name the most likely disease/pest, how sure you are in plain words, and 2-3 clear low-cost actions. If unclear, ask for a closer photo of the leaves.',
        image: buf.toString('base64'),
        mediaType,
        prompt: text || 'What is wrong with this plant?',
        maxTokens: 512,
      });
      logText = text ? `[photo] ${text}` : '[sent a plant photo]';

    // 2) Voice note → transcribe, then treat as text
    } else if (numMedia > 0 && mediaType.startsWith('audio/')) {
      const { buf } = await fetchTwilioMedia(mediaUrl);
      text = (await transcribeAudio(buf, 'voice.ogg')).trim();
      console.log(`[whatsapp in] transcribed: ${text}`);
      logText = `[voice] ${text}`;
      if (!text) reply = "Sorry, I couldn't understand that voice note. Please try again or type your question.";
    }

    // 3) Human handoff (only for text/voice, not photos)
    if (!reply && escalationRequested(text)) {
      const esc = addEscalation({
        phone: key,
        name: profile.name || '',
        question: text,
        reason: 'Farmer requested a human',
      });
      const officer = process.env.OFFICER_WHATSAPP;
      if (officer) {
        await sendWhatsApp(
          officer,
          `Lima handoff: ${profile.name || 'A farmer'} (${key}) asked for help:\n"${text}"`,
        ).catch((e) => console.error('[handoff] notify failed:', e.message));
      }
      reply =
        "I've asked a local extension officer to follow up with you. " +
        'In the meantime, feel free to tell me more and I will try to help.';
    }

    // 4) Normal chat (with price data folded in when relevant)
    if (!reply) {
      let extra = '';
      if (isPriceQuery(text)) {
        extra = priceContext(detectCrop(text) || detectCrop(profile.crop || ''));
      }
      const history = getConversation(from);
      history.push({ role: 'user', content: text || 'Hello' });
      reply = await aiChat({ system: buildSystem(profile, extra), messages: history, maxTokens: 512 });
    }

    // Persist this turn.
    appendMessage(from, 'user', logText || 'Hello');
    appendMessage(from, 'assistant', reply);

    // 5) Learn/remember the farmer (only while their profile is incomplete).
    if (!(profile.name && profile.crop && profile.location)) {
      const convo = getConversation(from)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');
      const found = await extractProfile(convo);
      const merged = {
        name: profile.name || found.name || '',
        crop: profile.crop || found.crop || '',
        location: profile.location || found.location || '',
      };
      if (merged.name || merged.crop || merged.location) saveProfile(key, merged);
    }
  } catch (e) {
    console.error('[whatsapp in]', e.message);
    reply = 'Sorry, the assistant is temporarily unavailable. Please try again shortly.';
  }

  twiml(res, reply);
});

/* -------------------------------------------- SMS (Africa's Talking) */
// Point your AT incoming-SMS callback here to grow an SMS-only interface.
app.post('/api/sms/incoming', async (req, res) => {
  const { from, text } = req.body ?? {};
  console.log(`[sms in] ${from}: ${text}`);
  const users = loadUsers();
  const user = users.find((u) => u.phone === from);
  const { reply, action } = handleIncomingSms(from, text);

  let finalReply = reply;
  if (action === 'weather') {
    const lat = user?.lat ?? -26.2;
    const lon = user?.lon ?? 28.04;
    try {
      const mm = await rain48h(lat, lon);
      finalReply = `Lima: about ${mm} mm of rain expected at your farm in the next 2 days.`;
    } catch {
      finalReply = 'Lima: weather service unavailable right now, try again later.';
    }
  }
  if (action === 'optout' && user) upsertUser({ ...user, optIn: false });
  if (action === 'optin') upsertUser({ phone: from, optIn: true, lat: user?.lat, lon: user?.lon, language: user?.language ?? 'en' });

  if (finalReply) await sendSMS(from, finalReply).catch(() => {});
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    ai: aiMode(),
    sms: smsMode(),
    whatsapp: whatsappMode(),
    push: !!process.env.VAPID_PUBLIC_KEY,
  });
});

/* ----------------------------------------------------------------- boot */
initPush();
startAlertScheduler();
app.listen(PORT, () => {
  console.log(`Lima server on http://localhost:${PORT}`);
  console.log(`  AI:   ${aiMode() === 'live' ? 'live (Groq ' + aiModel() + ')' : 'DEMO MODE (no GROQ_API_KEY)'}`);
  console.log(`  SMS:  ${smsMode()}`);
  console.log(`  WhatsApp: ${whatsappMode()} (Twilio)`);
});

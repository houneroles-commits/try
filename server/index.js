/**
 * Lima server — the minimal backend. Everything degrades gracefully:
 *   - no ANTHROPIC_API_KEY → /api/chat answers in clearly-labeled demo mode
 *   - no AT_* keys         → SMS logs in simulation mode
 *   - no VAPID keys        → web push disabled, SMS/simulation still works
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { upsertUser, loadUsers } from './store.js';
import { sendSMS, smsMode, handleIncomingSms } from './sms.js';
import { initPush, runAlertSweep, startAlertScheduler, rain48h } from './alerts.js';

const PORT = process.env.PORT ?? 8790;
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' })); // room for one compressed plant photo
app.use(express.urlencoded({ extended: true })); // Africa's Talking callbacks

/* ------------------------------------------------------------ Anthropic */
let anthropic = null;
async function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropic) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

const DEMO_REPLY =
  'Sample answer (server demo mode): water deeply every 3–4 days rather than a little every day, early in the morning. Add ANTHROPIC_API_KEY to server/.env for live answers.';

app.post('/api/chat', async (req, res) => {
  try {
    const { system, messages } = req.body ?? {};
    const client = await getAnthropic();
    if (!client) return res.json({ text: DEMO_REPLY, demo: true });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: system ?? 'You are a helpful farming assistant.',
      messages: Array.isArray(messages) ? messages : [],
    });
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    res.json({ text, demo: false });
  } catch (e) {
    console.error('[chat]', e.message);
    res.status(500).json({ error: 'chat_failed' });
  }
});

app.post('/api/diagnose', async (req, res) => {
  try {
    const { system, image, mediaType, prompt } = req.body ?? {};
    const client = await getAnthropic();
    if (!client)
      return res.json({
        text: 'Sample diagnosis (server demo mode): looks like early blight — remove affected leaves, avoid wetting foliage, consider a copper spray. Add ANTHROPIC_API_KEY for real analysis.',
        demo: true,
      });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: prompt ?? 'Diagnose this plant.' },
          ],
        },
      ],
    });
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    res.json({ text, demo: false });
  } catch (e) {
    console.error('[diagnose]', e.message);
    res.status(500).json({ error: 'diagnose_failed' });
  }
});

/* ------------------------------------------------------------- Alerts */
app.post('/api/alerts/optin', (req, res) => {
  const { phone, optIn, lat, lon, language, subscription } = req.body ?? {};
  if (!phone && !subscription) return res.status(400).json({ error: 'phone_or_subscription_required' });
  upsertUser({ phone, optIn: !!optIn, lat, lon, language, subscription });
  console.log(`[alerts] opt-${optIn ? 'in' : 'out'}: ${phone || 'push-only'}`);
  res.json({ ok: true, smsMode: smsMode() });
});

app.get('/api/push/vapidPublicKey', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
});

app.post('/api/alerts/run', async (_req, res) => {
  const result = await runAlertSweep(true);
  res.json(result);
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
    ai: !!process.env.ANTHROPIC_API_KEY,
    sms: smsMode(),
    push: !!process.env.VAPID_PUBLIC_KEY,
  });
});

/* ----------------------------------------------------------------- boot */
initPush();
startAlertScheduler();
app.listen(PORT, () => {
  console.log(`Lima server on http://localhost:${PORT}`);
  console.log(`  AI:   ${process.env.ANTHROPIC_API_KEY ? 'live (' + MODEL + ')' : 'DEMO MODE (no ANTHROPIC_API_KEY)'}`);
  console.log(`  SMS:  ${smsMode()}`);
});

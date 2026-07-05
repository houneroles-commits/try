/**
 * Lima voice line — a farmer with ANY phone calls a number and talks to the
 * same agricultural advisor that powers the app. No smartphone, data or
 * literacy needed.
 *
 * Pipeline per turn:
 *   caller audio → Africa's Talking <Record> → POST here → STT (providers.js)
 *   → Claude (same agricultural system prompt) → TTS → <Play>/<Say> back,
 *   then <Record> again for the next question. "#" or silence ends the call.
 *
 * Setup (documented in PROGRESS.md):
 *   1. Buy/assign a voice number in the Africa's Talking dashboard.
 *   2. Set the voice callback URL to  https://<public-host>/voice/incoming
 *      (use ngrok/cloudflared for local testing).
 *   3. Fill voice/.env — every missing key falls back to simulation logs.
 *
 * Runs standalone on its own port so it can scale independently of the app
 * server. Test the full loop without any phone: npm run simulate
 */
import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { transcribe, synthesize, sttProvider, ttsProvider } from './providers.js';

const PORT = process.env.VOICE_PORT ?? 8791;
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8';
const HOST_BASE = process.env.PUBLIC_BASE_URL ?? `http://localhost:${PORT}`;

const app = express();
app.use(express.urlencoded({ extended: true })); // AT posts form-encoded
app.use(express.json());
const { mkdirSync } = await import('node:fs');
mkdirSync(fileURLToPath(new URL('./audio-cache/', import.meta.url)), { recursive: true });
app.use('/audio', express.static(fileURLToPath(new URL('./audio-cache/', import.meta.url))));

/* --------------------------------------------------- per-call sessions */
/** sessionId → { lang, history: [{role, content}] } */
const sessions = new Map();
setInterval(() => {
  // drop stale sessions after ~1 h
  if (sessions.size > 500) sessions.clear();
}, 3600_000).unref();

/* --------------------------------------------------------- the advisor */
const LANG_NAMES = { en: 'English', zu: 'isiZulu', st: 'Sesotho', af: 'Afrikaans' };

function systemPrompt(lang) {
  return `You are Lima, an expert agricultural advisor speaking with a farmer OVER THE PHONE. They may have called from a basic phone with no screen.

Rules:
- Answer in ${LANG_NAMES[lang] ?? 'English'}.
- MAXIMUM 3 short sentences. This will be read aloud — no lists, no symbols, no markdown, just plain spoken sentences.
- Be practical and concrete about irrigation, planting, pests, soil and livestock basics.
- Prefer cheap, locally available solutions.
- If the question is unclear, ask ONE short clarifying question.`;
}

const DEMO_ANSWERS = {
  en: 'Water your maize deeply every three to four days, early in the morning. If rain is coming in the next two days, wait and let the sky do the work.',
  zu: 'Nisela ummbila wakho kakhulu njalo ezinsukwini ezintathu kuya kwezine, ekuseni kakhulu. Uma imvula iza ezinsukwini ezimbili ezizayo, linda.',
  st: 'Nosetsa poone ya hao haholo matsatsi a mararo ho isa a mane, hoseng haholo. Ha pula e tla matsatsing a mabedi a tlang, ema pele.',
  af: 'Gee jou mielies elke drie tot vier dae ’n deeglike natlei, vroeg in die oggend. As reën in die volgende twee dae kom, wag eerder.',
};

let anthropic = null;
async function askClaude(lang, history) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[voice AI SIMULATION] no ANTHROPIC_API_KEY — canned answer');
    return DEMO_ANSWERS[lang] ?? DEMO_ANSWERS.en;
  }
  if (!anthropic) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: systemPrompt(lang),
    messages: history,
  });
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
}

/* -------------------------------------------------- AT XML helpers */
const xml = (inner) => `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;

const RECORD_ATTRS = `finishOnKey="#" maxLength="25" trimSilence="true" playBeep="true"`;

function speakThenRecord(speech, callbackPath) {
  // AT: a <Record> with a nested prompt records after playing it.
  const prompt =
    'audioUrl' in speech
      ? `<Play url="${speech.audioUrl}"/>`
      : `<Say voice="woman">${escapeXml(speech.sayText)}</Say>`;
  return xml(`<Record ${RECORD_ATTRS} callbackUrl="${HOST_BASE}${callbackPath}">${prompt}</Record>`);
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------- routes */

// Step 1: call comes in → language menu
app.post('/voice/incoming', (req, res) => {
  const { sessionId, callerNumber } = req.body;
  console.log(`[voice] incoming call ${sessionId} from ${callerNumber}`);
  sessions.set(sessionId, { lang: 'en', history: [] });
  res.type('application/xml').send(
    xml(
      `<GetDigits timeout="12" numDigits="1" callbackUrl="${HOST_BASE}/voice/language">` +
        `<Say voice="woman">Welcome to Lima, your farming helper. ` +
        `For English, press 1. For isiZulu, press 2. For Sesotho, press 3. For Afrikaans, press 4.</Say>` +
        `</GetDigits>`,
    ),
  );
});

// Step 2: language chosen → invite the first question
app.post('/voice/language', async (req, res) => {
  const { sessionId, dtmfDigits } = req.body;
  const lang = { 1: 'en', 2: 'zu', 3: 'st', 4: 'af' }[dtmfDigits] ?? 'en';
  const session = sessions.get(sessionId) ?? { history: [] };
  session.lang = lang;
  sessions.set(sessionId, session);
  console.log(`[voice] ${sessionId} language=${lang}`);

  const invite = {
    en: 'Ask your farming question after the beep, then press the hash key.',
    zu: 'Buza umbuzo wakho wezolimo emva kokukhala, bese ucindezela u-hash.',
    st: 'Botsa potso ya hao ya temo ka mor’a molumo, ebe o tobetsa hash.',
    af: 'Vra jou boerderyvraag ná die biep, en druk dan die hutsteken.',
  }[lang];

  const speech = await synthesize(invite, lang, HOST_BASE).catch(() => ({ sayText: invite }));
  res.type('application/xml').send(speakThenRecord(speech, '/voice/turn'));
});

// Step 3 (repeats): recording arrives → STT → Claude → TTS → play + record again
app.post('/voice/turn', async (req, res) => {
  const { sessionId, recordingUrl, isActive } = req.body;
  const session = sessions.get(sessionId) ?? { lang: 'en', history: [] };

  if (!recordingUrl || isActive === '0') {
    console.log(`[voice] ${sessionId} ended (no recording)`);
    res.type('application/xml').send(xml('<Say voice="woman">Thank you for calling Lima. Goodbye.</Say>'));
    return;
  }

  try {
    const question = await transcribe(recordingUrl, session.lang);
    console.log(`[voice] ${sessionId} Q: ${question}`);
    session.history.push({ role: 'user', content: question || '…' });

    const answer = await askClaude(session.lang, session.history.slice(-8));
    console.log(`[voice] ${sessionId} A: ${answer}`);
    session.history.push({ role: 'assistant', content: answer });
    sessions.set(sessionId, session);

    const speech = await synthesize(answer, session.lang, HOST_BASE).catch(() => ({ sayText: answer }));
    res.type('application/xml').send(speakThenRecord(speech, '/voice/turn'));
  } catch (e) {
    console.error('[voice] turn failed:', e.message);
    res
      .type('application/xml')
      .send(xml('<Say voice="woman">Sorry, something went wrong. Please try again later.</Say>'));
  }
});

/* ------------------------------------- simulation: full loop, no phone */
app.post('/voice/simulate', async (req, res) => {
  const { text, lang = 'en', sessionId = 'sim' } = req.body ?? {};
  const session = sessions.get(sessionId) ?? { lang, history: [] };
  session.lang = lang;
  session.history.push({ role: 'user', content: text || 'When should I water my maize?' });
  const answer = await askClaude(lang, session.history.slice(-8));
  session.history.push({ role: 'assistant', content: answer });
  sessions.set(sessionId, session);
  res.json({
    providers: { stt: sttProvider(), tts: ttsProvider(), ai: process.env.ANTHROPIC_API_KEY ? 'live' : 'simulation' },
    question: text,
    answer,
  });
});

app.get('/voice/health', (_req, res) => {
  res.json({ ok: true, stt: sttProvider(), tts: ttsProvider(), ai: !!process.env.ANTHROPIC_API_KEY });
});

app.listen(PORT, () => {
  console.log(`Lima voice line on http://localhost:${PORT}`);
  console.log(`  STT: ${sttProvider()}  TTS: ${ttsProvider()}  AI: ${process.env.ANTHROPIC_API_KEY ? 'live' : 'simulation'}`);
  console.log('  Point the Africa\'s Talking voice callback at POST /voice/incoming');
});

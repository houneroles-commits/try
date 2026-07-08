/**
 * AI layer — Groq (OpenAI-compatible chat completions). Free, fast, no billing.
 * Falls back to demo mode when GROQ_API_KEY is absent, matching Lima's
 * "never break without keys" approach.
 *
 * .env:
 *   GROQ_API_KEY     (gsk_... from https://console.groq.com/keys)
 *   GROQ_MODEL       (optional, default llama-3.3-70b-versatile)
 *   GROQ_VISION_MODEL(optional, default meta-llama/llama-4-scout-17b-16e-instruct)
 */
const BASE = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

export function aiMode() {
  return process.env.GROQ_API_KEY ? 'live' : 'demo';
}

export function aiModel() {
  return MODEL;
}

// Anthropic-style content (string OR [{type,text}]) → plain text.
function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && (b.type === 'text' || typeof b.text === 'string'))
      .map((b) => b.text)
      .join('\n');
  }
  return String(content ?? '');
}

async function callGroq(body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = await res.text();
    try {
      msg = JSON.parse(msg).error?.message || msg;
    } catch {}
    throw new Error(`Groq ${res.status}: ${msg}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

/** Text chat. messages: [{ role: 'user'|'assistant', content }]. */
export async function aiChat({ system, messages, maxTokens = 1024 }) {
  const chat = [];
  if (system) chat.push({ role: 'system', content: system });
  for (const m of Array.isArray(messages) ? messages : []) {
    chat.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: contentToText(m.content),
    });
  }
  return callGroq({ model: MODEL, messages: chat, max_tokens: maxTokens });
}

/** Speech-to-text for WhatsApp voice notes, via Groq Whisper. */
export async function transcribeAudio(buffer, filename = 'audio.ogg') {
  const fd = new FormData();
  fd.append('file', new Blob([buffer]), filename);
  fd.append('model', process.env.GROQ_STT_MODEL || 'whisper-large-v3');
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: fd,
  });
  if (!res.ok) {
    let msg = await res.text();
    try {
      msg = JSON.parse(msg).error?.message || msg;
    } catch {}
    throw new Error(`Groq STT ${res.status}: ${msg}`);
  }
  const json = await res.json();
  return json.text ?? '';
}

/** Pull {name, crop, location} out of a conversation, for the farmer profile. */
export async function extractProfile(conversationText) {
  try {
    const raw = await callGroq({
      model: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'Extract the farmer\'s details from the conversation. Return ONLY a JSON object ' +
            'with keys "name", "crop", "location". Use an empty string for anything not stated. No prose.',
        },
        { role: 'user', content: conversationText },
      ],
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });
    const obj = JSON.parse(raw);
    return {
      name: (obj.name || '').trim(),
      crop: (obj.crop || '').trim(),
      location: (obj.location || '').trim(),
    };
  } catch {
    return {};
  }
}

/** Vision — diagnose a plant photo. image is base64 (no data: prefix). */
export async function aiVision({ system, image, mediaType, prompt, maxTokens = 1024 }) {
  const dataUrl = `data:${mediaType || 'image/jpeg'};base64,${image}`;
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: prompt || 'Diagnose this plant.' },
      { type: 'image_url', image_url: { url: dataUrl } },
    ],
  });
  return callGroq({ model: VISION_MODEL, messages, max_tokens: maxTokens });
}

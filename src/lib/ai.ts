/**
 * Assistant brain. Three modes, checked in order:
 *  1. Server proxy  (VITE_API_BASE set → key stays server-side; preferred)
 *  2. Direct browser (VITE_ANTHROPIC_API_KEY set → official SDK with
 *     dangerouslyAllowBrowser; fine for personal use, NOT for public deploys)
 *  3. Demo mode     (no key anywhere → realistic canned answers, labeled)
 *
 * The Anthropic SDK is imported dynamically so it is never downloaded
 * unless the assistant is actually used with a key.
 */
import type { ChatMsg, FarmProfile, WeatherBundle } from './types';
import { demoChatReply, demoDiagnosis } from './demo';

const env = (import.meta as any).env ?? {};
const API_BASE: string = env.VITE_API_BASE ?? 'http://localhost:8790';
const API_KEY: string = env.VITE_ANTHROPIC_API_KEY ?? '';
const MODEL: string = env.VITE_ANTHROPIC_MODEL ?? 'claude-opus-4-8';

export type AiMode = 'proxy' | 'direct' | 'demo';

export function aiMode(): AiMode {
  if (API_BASE) return 'proxy';
  if (API_KEY) return 'direct';
  return 'demo';
}

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  zu: 'isiZulu',
  st: 'Sesotho',
  af: 'Afrikaans',
};

export function buildSystemPrompt(
  profile: FarmProfile | null,
  language: string,
  weather: WeatherBundle | null,
): string {
  const langName = LANG_NAMES[language] ?? 'English';
  let ctx = '';
  if (profile) {
    ctx += `\nFarmer profile: crops: ${profile.crops.join(', ') || 'unknown'}; soil: ${profile.soil}; field size: ${profile.fieldSizeHa} ha; location: ${profile.location?.label ?? 'unknown'}.`;
  }
  if (weather) {
    const d = weather.daily
      .slice(0, 3)
      .map(
        (x) =>
          `${x.date}: ${x.tMin}–${x.tMax}°C, rain ${x.rainMm}mm (${x.rainProb}%)`,
      )
      .join('; ');
    ctx += `\n3-day forecast for their farm: ${d}.`;
  }
  return `You are Lima, an expert agricultural advisor for smallholder farmers in Africa. You advise on irrigation, crops, soil health, pests, diseases, planting and harvesting.

Rules:
- Answer in ${langName}.
- Keep answers SHORT (2-5 sentences), practical and concrete. No jargon. Assume limited literacy: simple words, no markdown tables, no long lists.
- Prefer low-cost, locally available solutions (hand tools, soap sprays, mulching) over expensive inputs.
- If a plant photo is provided, name the most likely disease or pest, how confident you are in plain words, and give 2-3 clear actions. If the photo is unclear, say so and ask for a closer photo of the leaves.
- If a question needs a local extension officer or vet, say so plainly.
- Never invent weather data beyond what is given.${ctx}`;
}

interface AiReply {
  text: string;
  demo: boolean;
}

function historyToApi(history: ChatMsg[]): { role: 'user' | 'assistant'; content: any }[] {
  // Send at most the last 12 turns to keep requests small on slow networks.
  return history.slice(-12).map((m) => ({
    role: m.role,
    content: m.text || '…',
  }));
}

async function directClient() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
}

export async function chat(
  history: ChatMsg[],
  profile: FarmProfile | null,
  language: string,
  weather: WeatherBundle | null,
): Promise<AiReply> {
  const system = buildSystemPrompt(profile, language, weather);
  const mode = aiMode();

  if (mode === 'demo') {
    await new Promise((r) => setTimeout(r, 700)); // feels alive, clearly labeled
    const last = history[history.length - 1]?.text ?? '';
    return { text: demoChatReply(last, language), demo: true };
  }

  if (mode === 'proxy') {
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: historyToApi(history) }),
      });
      if (!res.ok) throw new Error('proxy ' + res.status);
      const json = await res.json();
      return { text: json.text, demo: !!json.demo };
    } catch {
      const last = history[history.length - 1]?.text ?? '';
      return { text: demoChatReply(last, language), demo: true };
    }
  }

  const client = await directClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: historyToApi(history),
  });
  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');
  return { text, demo: false };
}

export async function diagnosePhoto(
  imageBase64: string,
  mediaType: string,
  userNote: string,
  profile: FarmProfile | null,
  language: string,
): Promise<AiReply> {
  const system = buildSystemPrompt(profile, language, null);
  const mode = aiMode();

  if (mode === 'demo') {
    await new Promise((r) => setTimeout(r, 1200));
    return { text: demoDiagnosis(language), demo: true };
  }

  const prompt =
    userNote.trim() ||
    'What is wrong with this plant? Diagnose likely disease or pest and tell me what to do.';

  if (mode === 'proxy') {
    try {
      const res = await fetch(`${API_BASE}/api/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, image: imageBase64, mediaType, prompt }),
      });
      if (!res.ok) throw new Error('proxy ' + res.status);
      const json = await res.json();
      return { text: json.text, demo: !!json.demo };
    } catch {
      return { text: demoDiagnosis(language), demo: true };
    }
  }

  const client = await directClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as any, data: imageBase64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });
  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');
  return { text, demo: false };
}

/** Downscale + JPEG-compress a photo before upload (low-data first). */
export async function compressImage(
  file: File,
  maxDim = 1024,
): Promise<{ base64: string; mediaType: string; dataUrl: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL('image/jpeg', 0.8);
  return {
    base64: out.split(',')[1],
    mediaType: 'image/jpeg',
    dataUrl: out,
  };
}

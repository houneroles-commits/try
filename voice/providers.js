/**
 * STT / TTS provider adapters for the Lima voice line.
 *
 * Research summary (July 2026 — details & sources in PROGRESS.md):
 *  ┌───────────┬──────────────────────────────┬──────────────────────────────┐
 *  │ Language  │ STT                          │ TTS                          │
 *  ├───────────┼──────────────────────────────┼──────────────────────────────┤
 *  │ English   │ everyone                     │ everyone (+ AT built-in Say) │
 *  │ Afrikaans │ Vulavula, Google, Azure      │ Azure af-ZA neural, Google   │
 *  │ isiZulu   │ Vulavula (best), Google      │ Azure zu-ZA neural           │
 *  │ Sesotho   │ Vulavula (only good option)  │ WEAK EVERYWHERE — fallback   │
 *  └───────────┴──────────────────────────────┴──────────────────────────────┘
 *  Recommended: Vulavula (Lelapa AI) for STT — built for SA languages incl.
 *  code-switching; Azure neural voices for zu/af TTS. Sesotho TTS currently
 *  has no strong commercial option: we fall back to English TTS with a
 *  spoken apology line, or pre-recorded prompts.
 *
 * Every adapter degrades to SIMULATION mode with clear logs when its
 * credentials are absent — the call flow never crashes.
 */

const VULAVULA_URL = 'https://vulavula.lelapa.ai/api/v1';

export function sttProvider() {
  if (process.env.VULAVULA_API_KEY) return 'vulavula';
  if (process.env.GOOGLE_STT_API_KEY) return 'google';
  return 'simulation';
}

export function ttsProvider() {
  if (process.env.AZURE_SPEECH_KEY) return 'azure';
  return 'simulation';
}

/* ------------------------------------------------------------------ STT */
export async function transcribe(audioUrl, lang) {
  const provider = sttProvider();

  if (provider === 'vulavula') {
    // TODO(live credentials): confirm exact endpoint + polling flow against
    // current Vulavula docs (https://docs.lelapa.ai). Shape as of research:
    // 1) download recording  2) POST multipart to /transcribe with lang code
    const audio = await fetch(audioUrl).then((r) => r.arrayBuffer());
    const form = new FormData();
    form.append('file', new Blob([audio], { type: 'audio/mpeg' }), 'call.mp3');
    form.append('language_code', { en: 'eng', zu: 'zul', st: 'sot', af: 'afr' }[lang] ?? 'eng');
    const res = await fetch(`${VULAVULA_URL}/transcribe/sync`, {
      method: 'POST',
      headers: { 'X-CLIENT-TOKEN': process.env.VULAVULA_API_KEY },
      body: form,
    });
    if (!res.ok) throw new Error(`vulavula ${res.status}`);
    const json = await res.json();
    return json.transcription_text ?? json.text ?? '';
  }

  if (provider === 'google') {
    // TODO(live credentials): Google STT v1 REST. zu-ZA / af-ZA supported;
    // st-ZA support is limited — verify before relying on it.
    const audio = await fetch(audioUrl).then((r) => r.arrayBuffer());
    const langCode = { en: 'en-ZA', zu: 'zu-ZA', st: 'st-ZA', af: 'af-ZA' }[lang] ?? 'en-ZA';
    const res = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_STT_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { languageCode: langCode, encoding: 'MP3', sampleRateHertz: 44100 },
          audio: { content: Buffer.from(audio).toString('base64') },
        }),
      },
    );
    if (!res.ok) throw new Error(`google stt ${res.status}`);
    const json = await res.json();
    return json.results?.map((r) => r.alternatives?.[0]?.transcript).join(' ') ?? '';
  }

  console.log(`[voice STT SIMULATION] lang=${lang} url=${audioUrl}`);
  return {
    en: 'When should I water my maize?',
    zu: 'Nginisele nini ummbila wami?',
    st: 'Ke nosetse poone ya ka neng?',
    af: 'Wanneer moet ek my mielies natlei?',
  }[lang] ?? 'When should I water my maize?';
}

/* ------------------------------------------------------------------ TTS */
/**
 * Returns { audioUrl } when real audio was synthesized and hosted, or
 * { sayText } when the caller should fall back to Africa's Talking's
 * built-in <Say> (English voice) — used in simulation and for Sesotho.
 */
export async function synthesize(text, lang, hostBase) {
  const provider = ttsProvider();

  // Sesotho: no dependable neural TTS as of research date → spoken fallback.
  const sesothoFallback =
    lang === 'st' && provider !== 'simulation'
      ? { sayText: text } // AT reads it in an English voice — imperfect but audible
      : null;
  if (sesothoFallback) {
    console.log('[voice TTS] Sesotho has weak TTS support — using <Say> fallback');
    return sesothoFallback;
  }

  if (provider === 'azure') {
    // TODO(live credentials): synthesize with Azure neural voices
    //   af-ZA-AdriNeural / af-ZA-WillemNeural, zu-ZA-ThandoNeural /
    //   zu-ZA-ThembaNeural, en-ZA-LeahNeural. Write MP3 to ./audio-cache and
    //   serve it from `${hostBase}/audio/<id>.mp3` for AT's <Play>.
    const voice = {
      en: 'en-ZA-LeahNeural',
      zu: 'zu-ZA-ThandoNeural',
      af: 'af-ZA-AdriNeural',
    }[lang];
    if (!voice) return { sayText: text };
    const region = process.env.AZURE_SPEECH_REGION ?? 'southafricanorth';
    const ssml = `<speak version="1.0" xml:lang="${lang}-ZA"><voice name="${voice}">${text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</voice></speak>`;
    const res = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        },
        body: ssml,
      },
    );
    if (!res.ok) throw new Error(`azure tts ${res.status}`);
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const id = Math.random().toString(36).slice(2, 10);
    mkdirSync(new URL('./audio-cache/', import.meta.url), { recursive: true });
    writeFileSync(
      new URL(`./audio-cache/${id}.mp3`, import.meta.url),
      Buffer.from(await res.arrayBuffer()),
    );
    return { audioUrl: `${hostBase}/audio/${id}.mp3` };
  }

  console.log(`[voice TTS SIMULATION] lang=${lang} text="${text.slice(0, 80)}…"`);
  return { sayText: text };
}

/**
 * Web Speech API wrappers — voice input (STT) and spoken replies (TTS)
 * for low-literacy use. Support varies by browser & language:
 *  - Chrome on Android handles en-ZA and af-ZA well; zu-ZA partially;
 *    st-ZA poorly (falls back to en-ZA). Documented in PROGRESS.md.
 */
import type { Language } from './types';

const STT_LANG: Record<Language, string> = {
  en: 'en-ZA',
  sw: 'sw-KE',
  zu: 'zu-ZA',
  st: 'st-ZA',
  af: 'af-ZA',
};

export function sttSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export interface Listening {
  stop: () => void;
}

export function listen(
  language: Language,
  onResult: (text: string, final: boolean) => void,
  onEnd: (error?: string) => void,
): Listening | null {
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = STT_LANG[language];
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onresult = (e: any) => {
    let text = '';
    let final = false;
    for (const res of e.results) {
      text += res[0].transcript;
      if (res.isFinal) final = true;
    }
    onResult(text, final);
  };
  rec.onerror = (e: any) => onEnd(e.error);
  rec.onend = () => onEnd();
  try {
    rec.start();
  } catch {
    return null;
  }
  return { stop: () => rec.stop() };
}

export function ttsSupported(): boolean {
  return 'speechSynthesis' in window || Boolean(API_BASE);
}

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '';

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;

// Prefer a natural ElevenLabs voice (via our server); fall back to the
// browser's built-in voice when the server has no ElevenLabs key or fails.
export function speak(text: string, language: Language, onDone?: () => void): void {
  stopSpeaking();
  if (API_BASE) {
    elevenSpeak(text, onDone).catch(() => browserSpeak(text, language, onDone));
    return;
  }
  browserSpeak(text, language, onDone);
}

async function elevenSpeak(text: string, onDone?: () => void): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('tts ' + res.status); // e.g. 501 → fall back
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  currentAudio = audio;
  const cleanup = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };
  audio.onended = () => { cleanup(); onDone?.(); };
  audio.onerror = () => { cleanup(); };
  await audio.play(); // rejects on autoplay block → caller falls back
}

function browserSpeak(text: string, language: Language, onDone?: () => void): void {
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = STT_LANG[language];
  utter.rate = 0.95;
  const voices = speechSynthesis.getVoices();
  const match =
    voices.find((v) => v.lang === STT_LANG[language]) ||
    voices.find((v) => v.lang.startsWith(language)) ||
    voices.find((v) => v.lang.startsWith('en-ZA'));
  if (match) utter.voice = match;
  if (onDone) utter.onend = onDone;
  currentUtterance = utter;
  speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  currentUtterance = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export function isSpeaking(): boolean {
  const synth = 'speechSynthesis' in window && speechSynthesis.speaking;
  const audio = Boolean(currentAudio && !currentAudio.paused);
  return synth || audio;
}

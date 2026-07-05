/**
 * Web Speech API wrappers — voice input (STT) and spoken replies (TTS)
 * for low-literacy use. Support varies by browser & language:
 *  - Chrome on Android handles en-ZA and af-ZA well; zu-ZA partially;
 *    st-ZA poorly (falls back to en-ZA). Documented in PROGRESS.md.
 */
import type { Language } from './types';

const STT_LANG: Record<Language, string> = {
  en: 'en-ZA',
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
  return 'speechSynthesis' in window;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, language: Language, onDone?: () => void): void {
  if (!ttsSupported()) return;
  stopSpeaking();
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
  if (ttsSupported()) speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  return ttsSupported() && speechSynthesis.speaking;
}

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../state/AppContext';
import { aiMode, chat, compressImage, diagnosePhoto } from '../lib/ai';
import { listen, speak, stopSpeaking, sttSupported, ttsSupported, type Listening } from '../lib/speech';
import type { ChatMsg } from '../lib/types';
import { KEYS, load, save, uid } from '../lib/storage';
import { Icon } from '../components/Icon';

function Bubble({ msg, onSpeak }: { msg: ChatMsg; onSpeak?: () => void }) {
  const { t } = useTranslation();
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 ${
          isUser
            ? 'bg-clay text-on-clay rounded-br-lg'
            : msg.error
              ? 'bg-danger/10 border border-danger/40 text-ink rounded-bl-lg'
              : 'bg-surface border border-line text-ink rounded-bl-lg shadow-card'
        }`}
      >
        {msg.image && (
          <img
            src={msg.image}
            alt=""
            className="rounded-2xl mb-2 max-h-44 w-full object-cover"
          />
        )}
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {msg.demo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sun/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              <Icon name="sparkle" size={10} />
              {t('assistant.demoNote')}
            </span>
          )}
          {!isUser && onSpeak && ttsSupported() && (
            <button
              onClick={onSpeak}
              className="tap !min-h-[32px] !min-w-[32px] inline-flex items-center justify-center rounded-full text-ink-faint active:text-clay-strong"
              aria-label={t('settings.voiceReplies')}
            >
              <Icon name="speaker" size={15} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Assistant() {
  const { t } = useTranslation();
  const { profile, settings, weather, online } = useApp();
  const [messages, setMessages] = useState<ChatMsg[]>(() =>
    load(KEYS.chat, [] as ChatMsg[]),
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const listenRef = useRef<Listening | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const mode = aiMode();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  useEffect(() => () => stopSpeaking(), []);

  const persist = (msgs: ChatMsg[]) => {
    setMessages(msgs);
    save(KEYS.chat, msgs.slice(-40));
  };

  const pushAssistant = (msgs: ChatMsg[], text: string, demo: boolean, error = false) => {
    const reply: ChatMsg = {
      id: uid(),
      role: 'assistant',
      text,
      time: new Date().toISOString(),
      demo,
      error,
    };
    const next = [...msgs, reply];
    persist(next);
    if (settings.voiceReplies && !error) speak(text, settings.language);
    return next;
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    stopSpeaking();
    const userMsg: ChatMsg = {
      id: uid(),
      role: 'user',
      text: trimmed,
      time: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    persist(next);
    setInput('');
    setBusy(true);
    try {
      const reply = await chat(next, profile, settings.language, weather);
      pushAssistant(next, reply.text, reply.demo);
    } catch {
      pushAssistant(next, t('common.error'), false, true);
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (file: File) => {
    if (busy) return;
    stopSpeaking();
    setBusy(true);
    try {
      const { base64, mediaType, dataUrl } = await compressImage(file);
      const userMsg: ChatMsg = {
        id: uid(),
        role: 'user',
        text: input.trim() || t('assistant.photoDiagnosis'),
        image: dataUrl,
        time: new Date().toISOString(),
      };
      const next = [...messages, userMsg];
      persist(next);
      setInput('');
      const reply = await diagnosePhoto(
        base64,
        mediaType,
        userMsg.text,
        profile,
        settings.language,
      );
      pushAssistant(next, reply.text, reply.demo);
    } catch {
      pushAssistant(messages, t('common.error'), false, true);
    } finally {
      setBusy(false);
    }
  };

  const toggleListen = () => {
    if (listening) {
      listenRef.current?.stop();
      setListening(false);
      return;
    }
    const session = listen(
      settings.language,
      (text, final) => {
        setInput(text);
        if (final) {
          setListening(false);
          void send(text);
        }
      },
      () => setListening(false),
    );
    if (session) {
      listenRef.current = session;
      setListening(true);
    }
  };

  const offlineBlocked = !online && mode !== 'demo';

  return (
    <div className="mx-auto max-w-lg flex flex-col" style={{ height: 'calc(100dvh - 96px)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">{t('assistant.title')}</h1>
        {mode === 'demo' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sun/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            <Icon name="sparkle" size={12} />
            {t('common.demoData')}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-3">
        {/* welcome + suggestions */}
        {messages.length === 0 && (
          <div className="pt-2">
            <div className="card p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-2xl bg-clay text-on-clay flex items-center justify-center">
                  <Icon name="sprout" size={20} />
                </div>
                <p className="text-[15px] text-ink leading-relaxed">
                  {t('assistant.welcome')}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {(['suggest1', 'suggest2', 'suggest3'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => void send(t(`assistant.${k}`))}
                  className="tap w-full text-left card px-4 py-3 text-sm font-semibold text-clay-strong active:bg-clay-soft/30"
                >
                  {t(`assistant.${k}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <Bubble
            key={m.id}
            msg={m}
            onSpeak={
              m.role === 'assistant'
                ? () => speak(m.text, settings.language)
                : undefined
            }
          />
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="bg-surface border border-line rounded-3xl rounded-bl-lg px-5 py-3.5 shadow-card">
              <div className="flex gap-1.5" aria-label={t('assistant.thinking')}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 rounded-full bg-clay"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="px-4 pb-3">
        {offlineBlocked && (
          <p className="text-xs font-semibold text-ink-soft text-center mb-2">
            {t('assistant.offlineNote')}
          </p>
        )}
        <AnimatePresence>
          {listening && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm font-bold text-clay-strong mb-2"
            >
              {t('assistant.listening')}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex items-end gap-2">
          {/* photo diagnosis button */}
          <button
            className="tap w-12 h-12 shrink-0 rounded-2xl bg-surface-2 text-clay-strong flex items-center justify-center active:bg-clay-soft/50 disabled:opacity-45"
            onClick={() => fileRef.current?.click()}
            disabled={busy || offlineBlocked}
            aria-label={t('assistant.photoDiagnosis')}
          >
            <Icon name="camera" size={22} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPhoto(f);
              e.target.value = '';
            }}
          />

          <div className="flex-1 flex items-end rounded-2xl border border-line bg-surface">
            <input
              className="flex-1 bg-transparent px-4 py-3 text-ink placeholder:text-ink-faint outline-none min-h-[48px]"
              value={input}
              placeholder={t('assistant.placeholder')}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send(input);
              }}
              disabled={busy || offlineBlocked}
            />
            {sttSupported() && (
              <button
                className={`tap w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl m-0.5 ${
                  listening
                    ? 'bg-danger text-on-danger animate-pulse'
                    : 'text-ink-faint active:text-clay-strong'
                }`}
                onClick={toggleListen}
                disabled={busy || offlineBlocked}
                aria-label={listening ? t('common.close') : t('assistant.tapToSpeak')}
                aria-pressed={listening}
              >
                <Icon name={listening ? 'stop' : 'mic'} size={21} />
              </button>
            )}
          </div>

          <button
            className="tap w-12 h-12 shrink-0 rounded-2xl bg-clay text-on-clay flex items-center justify-center active:bg-clay-strong disabled:opacity-45"
            onClick={() => void send(input)}
            disabled={!input.trim() || busy || offlineBlocked}
            aria-label={t('assistant.send')}
          >
            <Icon name="send" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

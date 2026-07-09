import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import type { AppMode } from '../lib/types';
import { Icon, type IconName } from '../components/Icon';

export default function ModeSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateSettings } = useApp();

  const choose = (mode: AppMode) => {
    updateSettings({ appMode: mode });
    navigate(mode === 'hub' ? '/hub' : '/', { replace: true });
  };

  const cards: { mode: AppMode; icon: IconName; title: string; body: string }[] = [
    { mode: 'personal', icon: 'sprout', title: t('mode.personalTitle'), body: t('mode.personalBody') },
    { mode: 'hub', icon: 'globe', title: t('mode.hubTitle'), body: t('mode.hubBody') },
  ];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
      <div className="absolute inset-0 glow-radial opacity-40 pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-md">
        <h1 className="text-4xl font-display font-bold text-ink text-center">{t('app.name')}</h1>
        <p className="text-center text-ink-soft mt-2 mb-8">{t('mode.prompt')}</p>

        <div className="space-y-3">
          {cards.map((c) => (
            <button
              key={c.mode}
              onClick={() => choose(c.mode)}
              className="card tap w-full text-left p-5 flex items-start gap-4 bg-gradient-to-br from-surface to-surface-2/50 active:brightness-95 shadow-card"
            >
              <span className="w-12 h-12 rounded-2xl bg-clay text-on-clay flex items-center justify-center shrink-0 shadow-glow">
                <Icon name={c.icon} size={24} />
              </span>
              <span className="flex-1">
                <span className="block font-extrabold text-ink text-lg leading-tight">{c.title}</span>
                <span className="block text-sm text-ink-soft mt-1">{c.body}</span>
              </span>
              <Icon name="chevronRight" size={20} className="text-ink-faint mt-3" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-ink-faint mt-6">{t('mode.switchLater')}</p>
      </div>
    </div>
  );
}

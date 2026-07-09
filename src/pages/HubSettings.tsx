import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useApp } from '../state/AppContext';
import { LANGUAGES } from '../i18n';
import type { Language, ThemeMode } from '../lib/types';
import { Icon, type IconName } from '../components/Icon';
import { Button, SectionTitle } from '../components/ui';

const CLERK_ON = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export default function HubSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings, updateSettings } = useApp();
  const textSize = settings.textSize ?? 'normal';

  return (
    <div className="min-h-dvh">
      <header className="relative overflow-hidden bg-soil text-bg dark:text-ink px-5 pt-7 pb-6 rounded-b-[2rem]">
        <div className="absolute inset-0" aria-hidden
          style={{ background: 'linear-gradient(160deg, rgb(var(--c-umber)) 0%, rgb(var(--c-soil)) 70%)' }} />
        <div className="absolute inset-0 glow-radial opacity-70 pointer-events-none" aria-hidden />
        <div className="relative">
          <button onClick={() => navigate('/hub')} className="tap flex items-center gap-1 text-sm font-semibold text-bg/90 dark:text-ink/80 mb-2">
            <Icon name="chevronLeft" size={18} /> {t('hub.title')}
          </button>
          <h1 className="text-2xl font-display font-bold text-bg dark:text-ink">{t('hub.settingsTitle')}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pb-24">
        {/* language */}
        <SectionTitle>{t('settings.language')}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((l) => (
            <button key={l.code} aria-pressed={settings.language === l.code}
              onClick={() => updateSettings({ language: l.code as Language })}
              className={`tap card py-3.5 font-bold text-ink text-sm ${settings.language === l.code ? 'border-2 border-clay bg-clay-soft/30' : ''}`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* appearance */}
        <SectionTitle>{t('settings.theme')}</SectionTitle>
        <div className="inline-flex w-full rounded-xl bg-surface-2 p-1">
          {(([['light', 'sun'], ['dark', 'moon'], ['system', 'settings']]) as [ThemeMode, IconName][]).map(([mode, icon]) => (
            <button key={mode} aria-pressed={settings.theme === mode} onClick={() => updateSettings({ theme: mode })}
              className={`tap flex-1 min-h-[44px] rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-colors ${settings.theme === mode ? 'bg-surface text-ink shadow-card' : 'text-ink-faint'}`}>
              <Icon name={icon} size={15} />{t(`settings.${mode}`)}
            </button>
          ))}
        </div>

        {/* accessibility */}
        <SectionTitle>{t('settings.accessibility')}</SectionTitle>
        <div className="inline-flex w-full rounded-xl bg-surface-2 p-1">
          {(['normal', 'large'] as const).map((size) => (
            <button key={size} aria-pressed={textSize === size} onClick={() => updateSettings({ textSize: size })}
              className={`tap flex-1 min-h-[44px] rounded-lg flex items-center justify-center font-bold transition-colors ${size === 'large' ? 'text-lg' : 'text-sm'} ${textSize === size ? 'bg-surface text-ink shadow-card' : 'text-ink-faint'}`}>
              {t(size === 'large' ? 'settings.textLarge' : 'settings.textNormal')}
            </button>
          ))}
        </div>
        <button onClick={() => updateSettings({ highContrast: !settings.highContrast })}
          className="tap card mt-2 w-full flex items-center gap-3 px-4 py-3.5 text-left">
          <Icon name="sun" size={20} className="text-clay-strong shrink-0" />
          <span className="flex-1">
            <span className="block font-bold text-ink text-sm">{t('settings.sunlight')}</span>
            <span className="block text-xs text-ink-soft">{t('settings.sunlightHint')}</span>
          </span>
          <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${settings.highContrast ? 'bg-clay' : 'bg-line'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform ${settings.highContrast ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </button>

        {/* account */}
        <SectionTitle>{t('hub.account')}</SectionTitle>
        <div className="card divide-y divide-line/60">
          <button onClick={() => navigate('/welcome')} className="tap w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2">
            <Icon name="globe" size={19} className="text-clay-strong" />
            <span className="flex-1 font-bold text-ink text-sm">{t('settings.switchMode')}</span>
            <Icon name="chevronRight" size={16} className="text-ink-faint" />
          </button>
          {CLERK_ON && <SignOutRow />}
        </div>

        {/* about */}
        <SectionTitle>{t('settings.about')}</SectionTitle>
        <div className="card px-4 py-4">
          <p className="text-sm text-ink-soft leading-relaxed">{t('settings.aboutBody')}</p>
          <p className="text-xs text-ink-faint mt-2 font-semibold">{t('settings.version')} 0.1.0</p>
        </div>
      </div>
    </div>
  );
}

function SignOutRow() {
  const { t } = useTranslation();
  const { signOut } = useClerk();
  return (
    <button onClick={() => void signOut({ redirectUrl: '/welcome' })}
      className="tap w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2">
      <Icon name="x" size={19} className="text-danger" />
      <span className="flex-1 font-bold text-danger text-sm">{t('hub.signOut')}</span>
    </button>
  );
}

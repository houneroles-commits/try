import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SectionTitle } from '../components/ui';

export default function About() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const uses = [t('about.use1'), t('about.use2'), t('about.use3'), t('about.use4')];

  return (
    <div className="min-h-dvh">
      <header className="relative overflow-hidden bg-soil text-bg dark:text-ink px-5 pt-7 pb-6 rounded-b-[2rem]">
        <div className="absolute inset-0" aria-hidden
          style={{ background: 'linear-gradient(160deg, rgb(var(--c-umber)) 0%, rgb(var(--c-soil)) 70%)' }} />
        <div className="absolute inset-0 glow-radial opacity-70 pointer-events-none" aria-hidden />
        <div className="relative">
          <button onClick={() => navigate(-1)} className="tap flex items-center gap-1 text-sm font-semibold text-bg/90 dark:text-ink/80 mb-2">
            <Icon name="chevronLeft" size={18} /> {t('common.back')}
          </button>
          <h1 className="text-3xl font-display font-bold text-bg dark:text-ink">{t('about.title')}</h1>
          <p className="text-sm text-bg/80 dark:text-ink/75 mt-1">{t('app.tagline')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pb-24">
        <div className="card p-5 mt-4">
          <p className="text-sm text-ink-soft leading-relaxed">{t('about.intro')}</p>
        </div>

        <SectionTitle>{t('about.useTitle')}</SectionTitle>
        <div className="card divide-y divide-line/60">
          {uses.map((u, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-clay-soft text-clay-strong text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-sm text-ink">{u}</p>
            </div>
          ))}
        </div>

        <SectionTitle>{t('about.dataTitle')}</SectionTitle>
        <div className="card px-4 py-4">
          <p className="text-sm text-ink-soft leading-relaxed">{t('about.dataBody')}</p>
        </div>

        <SectionTitle>{t('about.contactTitle')}</SectionTitle>
        <div className="card px-4 py-4">
          <p className="text-sm text-ink-soft leading-relaxed">{t('about.contactBody')}</p>
          <p className="text-xs text-ink-faint mt-3 font-semibold">{t('settings.version')} 0.1.0</p>
        </div>
      </div>
    </div>
  );
}

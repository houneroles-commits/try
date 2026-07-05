import { Suspense, lazy, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { adviseIrrigation } from '../lib/irrigation';
import { cropStatus, CROPS } from '../lib/season';
import type { CropId, RecordKind } from '../lib/types';
import { AdviceCard } from '../components/AdviceCard';
import { ForecastStrip, WeatherGlyph, conditionKey } from '../components/WeatherBits';
import { Icon } from '../components/Icon';
import { Button, SectionTitle, Sheet, Skeleton, SourceBadge, Toast } from '../components/ui';
import { canRun3D } from '../lib/connectivity';

// If the chunk can't load (e.g. offline before first use) fall back to the
// static gradient rather than an error.
const Hero3D = lazy(() =>
  import('../components/Hero3D').catch(() => ({
    default: (() => null) as unknown as typeof import('../components/Hero3D').default,
  })),
);

function greetKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'home.greetingMorning';
  if (h < 17) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

/* ------------------------------------------------ 2-tap quick logger */
function QuickLog() {
  const { t } = useTranslation();
  const { addRecord, profile } = useApp();
  const [kind, setKind] = useState<RecordKind | null>(null);
  const [toast, setToast] = useState(false);
  const crop: CropId | undefined = profile?.crops[0];

  const amounts =
    kind === 'harvest' ? [5, 10, 25, 50, 100] : [2, 5, 10, 20, 30];

  const log = (amount: number) => {
    if (!kind) return;
    addRecord({
      kind,
      date: new Date().toISOString().slice(0, 10),
      amount,
      crop: kind === 'harvest' ? crop : undefined,
    });
    setKind(null);
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['rain', 'rain', 'home.logRain'],
            ['irrigation', 'drop', 'home.logIrrigation'],
            ['harvest', 'sprout', 'home.logHarvest'],
          ] as const
        ).map(([k, icon, label]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className="card tap flex flex-col items-center gap-1.5 py-4 active:bg-surface-2"
          >
            <span className="text-clay-strong">
              <Icon name={icon} size={24} />
            </span>
            <span className="text-sm font-bold text-ink">{t(label)}</span>
          </button>
        ))}
      </div>

      <Sheet
        open={kind !== null}
        onClose={() => setKind(null)}
        title={kind === 'harvest' ? t('records.amountKg') : t('records.amountMm')}
      >
        <div className="grid grid-cols-5 gap-2 pb-2">
          {amounts.map((a) => (
            <button
              key={a}
              onClick={() => log(a)}
              className="tap card flex items-center justify-center py-4 text-lg font-extrabold text-clay-strong active:bg-clay-soft/50"
            >
              {a}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-ink-faint">
          {kind === 'harvest' ? t('common.kg') : t('common.mm')}
        </p>
      </Sheet>
      <Toast show={toast} text={t('home.logged')} />
    </>
  );
}

/* ------------------------------------------------ season snapshot */
function SeasonSnapshot() {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  if (!profile || profile.crops.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
      {profile.crops.map((c) => {
        const planted = profile.plantingDates[c];
        const status = planted ? cropStatus(c, planted) : null;
        return (
          <Link
            key={c}
            to="/calendar"
            className="card shrink-0 min-w-[150px] p-3 active:bg-surface-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {CROPS[c].emoji}
              </span>
              <div>
                <p className="font-bold text-ink text-sm">{t(`crops.${c}`)}</p>
                {status ? (
                  <p className="text-[11px] font-semibold text-ink-soft">
                    {t(`stages.${status.stage.key}`)} ·{' '}
                    {t('calendar.daysToHarvest', { count: status.daysToHarvest })}
                  </p>
                ) : (
                  <p className="text-[11px] font-semibold text-ink-faint">
                    {t('calendar.setPlantingDate')}
                  </p>
                )}
              </div>
            </div>
            {status && (
              <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-clay"
                  style={{ width: `${Math.round(status.progress * 100)}%` }}
                />
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    profile,
    weather,
    weatherLoading,
    settings,
    updateSettings,
    lastWatered,
    records,
  } = useApp();

  const threeDAllowed = canRun3D() && !settings.dataSaver;

  const advice = useMemo(() => {
    if (!weather || !profile || profile.crops.length === 0) return null;
    const crop = profile.crops[0];
    return adviseIrrigation({
      crop,
      soil: profile.soil,
      fieldSizeHa: profile.fieldSizeHa,
      lastWatered,
      plantingDate: profile.plantingDates[crop],
      weather,
      records,
    });
  }, [weather, profile, lastWatered, records]);

  return (
    <div>
      {/* ---------------- hero ---------------- */}
      <header className="relative overflow-hidden rounded-b-[2rem] bg-soil text-bg dark:text-ink">
        {settings.show3D && threeDAllowed && (
          <Suspense fallback={null}>
            <Hero3D />
          </Suspense>
        )}
        {!settings.show3D && (
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(160deg, rgb(var(--c-umber)) 0%, rgb(var(--c-soil)) 70%)',
            }}
          />
        )}
        <div className="relative px-5 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-bg/80 dark:text-ink/70">
                {t(greetKey())}
                {profile?.name ? `, ${profile.name}` : ''}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-bg dark:text-ink">
                {t('app.name')}
              </h1>
              <p className="text-sm text-bg/75 dark:text-ink/70 font-medium">
                {t('app.tagline')}
              </p>
            </div>
            {threeDAllowed && (
              <button
                onClick={() => updateSettings({ show3D: !settings.show3D })}
                className="tap flex items-center gap-1.5 rounded-full bg-bg/15 px-3.5 py-2 text-xs font-bold text-bg dark:text-ink backdrop-blur"
                aria-pressed={settings.show3D}
              >
                <Icon name="sparkle" size={14} />
                {settings.show3D ? t('home.hide3d') : t('home.show3d')}
              </button>
            )}
          </div>

          {/* compact current weather in hero */}
          {weather && (
            <Link
              to="/weather"
              className="mt-5 flex items-center gap-3 rounded-2xl bg-bg/12 backdrop-blur px-4 py-3 active:bg-bg/20"
              style={{ backgroundColor: 'rgb(var(--c-bg) / 0.14)' }}
            >
              <WeatherGlyph code={weather.current.weatherCode} size={34} />
              <div className="flex-1">
                <span className="text-2xl font-extrabold text-bg dark:text-ink">
                  {weather.current.temp}°C
                </span>
                <span className="ml-2 text-sm font-medium text-bg/80 dark:text-ink/75">
                  {t(conditionKey(weather.current.weatherCode))}
                </span>
                <p className="text-[11px] font-semibold text-bg/60 dark:text-ink/60">
                  {weather.locationLabel}
                </p>
              </div>
              <SourceBadge source={weather.source} />
              <Icon name="chevronRight" size={18} className="text-bg/60 dark:text-ink/60" />
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* ---------------- irrigation advice (THE core card) -------------- */}
        <div className="mt-4">
          {weatherLoading && !weather ? (
            <Skeleton className="h-44" />
          ) : advice && profile ? (
            <AdviceCard
              advice={advice}
              fieldSizeHa={profile.fieldSizeHa}
              onAdjust={() => navigate('/irrigation')}
            />
          ) : (
            <div className="card p-5 border-2 border-clay/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-clay text-on-clay flex items-center justify-center shrink-0">
                  <Icon name="sprout" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-ink text-lg leading-tight">
                    {t('home.setupFarm')}
                  </h3>
                  <p className="text-sm text-ink-soft mt-0.5">
                    {t('home.setupFarmHint')}
                  </p>
                </div>
              </div>
              <Button
                full
                className="mt-4"
                icon="chevronRight"
                onClick={() => navigate('/onboarding')}
              >
                {t('home.setupFarm')}
              </Button>
            </div>
          )}
        </div>

        {/* ---------------- quick log ---------------- */}
        <SectionTitle>{t('home.quickLog')}</SectionTitle>
        <QuickLog />

        {/* ---------------- forecast ---------------- */}
        <SectionTitle
          action={
            <Link
              to="/weather"
              className="text-xs font-bold text-clay-strong flex items-center gap-0.5"
            >
              {t('weather.forecast7')}
              <Icon name="chevronRight" size={14} />
            </Link>
          }
        >
          {t('nav.weather')}
        </SectionTitle>
        {weather ? (
          <ForecastStrip daily={weather.daily} />
        ) : (
          <Skeleton className="h-32" />
        )}

        {/* ---------------- season ---------------- */}
        {profile && profile.crops.length > 0 && (
          <>
            <SectionTitle
              action={
                <Link
                  to="/calendar"
                  className="text-xs font-bold text-clay-strong flex items-center gap-0.5"
                >
                  {t('home.viewCalendar')}
                  <Icon name="chevronRight" size={14} />
                </Link>
              }
            >
              {t('home.seasonSnapshot')}
            </SectionTitle>
            <SeasonSnapshot />
          </>
        )}

        {/* ---------------- records shortcut ---------------- */}
        <div className="mt-6 mb-4">
          <Link
            to="/records"
            className="card tap flex items-center gap-3 px-4 py-3.5 active:bg-surface-2"
          >
            <Icon name="calendar" size={20} className="text-clay-strong" />
            <span className="flex-1 font-bold text-ink">{t('home.records')}</span>
            <span className="text-xs font-semibold text-ink-faint">
              {records.length}
            </span>
            <Icon name="chevronRight" size={16} className="text-ink-faint" />
          </Link>
        </div>
      </div>
    </div>
  );
}

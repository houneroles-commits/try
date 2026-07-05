import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../state/AppContext';
import { getGPS, PRESET_LOCATIONS, searchPlace } from '../lib/geo';
import { CROP_IDS, CROPS } from '../lib/season';
import type { CropId, GeoPoint, Language, SoilId } from '../lib/types';
import { LANGUAGES } from '../i18n';
import { Icon } from '../components/Icon';
import { Button, Field, inputCls } from '../components/ui';

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings, updateSettings, profile, saveProfile } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.name ?? '');
  const [location, setLocation] = useState<GeoPoint | null>(
    profile?.location ?? null,
  );
  const [crops, setCrops] = useState<CropId[]>(profile?.crops ?? []);
  const [soil, setSoil] = useState<SoilId>(profile?.soil ?? 'loam');
  const [sizeHa, setSizeHa] = useState(profile?.fieldSizeHa ?? 1);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoPoint[]>([]);

  const finish = (skipped = false) => {
    if (!skipped) {
      saveProfile({
        name: name.trim(),
        location,
        crops: crops.length > 0 ? crops : ['maize'],
        soil,
        fieldSizeHa: sizeHa || 1,
        plantingDates: profile?.plantingDates ?? {},
        createdAt: profile?.createdAt ?? new Date().toISOString(),
      });
    }
    updateSettings({ onboarded: true });
    navigate('/', { replace: true });
  };

  const useGps = async () => {
    setGpsBusy(true);
    setGpsError(false);
    try {
      const p = await getGPS();
      setLocation({ ...p, label: 'GPS' });
    } catch {
      setGpsError(true);
    } finally {
      setGpsBusy(false);
    }
  };

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 3) return setResults([]);
    try {
      setResults(await searchPlace(q));
    } catch {
      setResults([]);
    }
  };

  const steps = [
    /* ------------------------------------------ 0: welcome + language */
    <div key="lang">
      <div className="w-16 h-16 rounded-3xl bg-clay flex items-center justify-center text-on-clay mb-5">
        <Icon name="sprout" size={32} />
      </div>
      <h1 className="text-3xl font-extrabold text-ink text-balance">
        {t('onboarding.welcome')}
      </h1>
      <p className="text-ink-soft mt-2 mb-6">{t('onboarding.welcomeBody')}</p>
      <p className="text-sm font-bold uppercase tracking-wider text-ink-soft mb-2">
        {t('onboarding.chooseLanguage')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => updateSettings({ language: l.code as Language })}
            aria-pressed={settings.language === l.code}
            className={`tap card py-4 font-bold text-ink ${
              settings.language === l.code
                ? 'border-2 border-clay bg-clay-soft/30'
                : ''
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>,

    /* ------------------------------------------ 1: location */
    <div key="loc">
      <h1 className="text-2xl font-extrabold text-ink mb-4">
        {t('onboarding.whereFarm')}
      </h1>
      <Button full icon="pin" onClick={() => void useGps()} disabled={gpsBusy}>
        {gpsBusy ? t('common.loading') : t('onboarding.gpsButton')}
      </Button>
      {gpsError && (
        <p className="text-sm font-semibold text-danger mt-2">
          {t('weather.gpsDenied')}
        </p>
      )}
      {location && (
        <div className="card flex items-center gap-3 p-3 mt-3 border-2 border-clay">
          <Icon name="check" size={18} className="text-clay-strong" />
          <span className="font-bold text-ink text-sm">
            {location.label === 'GPS'
              ? `${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}`
              : location.label}
          </span>
        </div>
      )}
      <p className="text-sm font-semibold text-ink-soft mt-5 mb-2">
        {t('onboarding.orPickCity')}
      </p>
      <input
        className={inputCls}
        value={query}
        onChange={(e) => void search(e.target.value)}
        placeholder={t('weather.searchPlace')}
      />
      <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
        {(results.length > 0 ? results : PRESET_LOCATIONS.slice(0, 6)).map((loc) => (
          <button
            key={loc.label + loc.lat}
            onClick={() => setLocation(loc)}
            className={`tap w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-surface-2 ${
              location?.label === loc.label ? 'bg-clay-soft/30' : ''
            }`}
          >
            <Icon name="pin" size={16} className="text-clay-strong shrink-0" />
            <span className="font-semibold text-ink text-sm">{loc.label}</span>
          </button>
        ))}
      </div>
    </div>,

    /* ------------------------------------------ 2: crops + soil + size */
    <div key="farm">
      <h1 className="text-2xl font-extrabold text-ink mb-4">
        {t('onboarding.yourCrops')}
      </h1>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {CROP_IDS.map((c) => {
          const active = crops.includes(c);
          return (
            <button
              key={c}
              aria-pressed={active}
              onClick={() =>
                setCrops((prev) =>
                  active ? prev.filter((x) => x !== c) : [...prev, c],
                )
              }
              className={`tap card flex flex-col items-center gap-1 py-3 ${
                active ? 'border-2 border-clay bg-clay-soft/30' : ''
              }`}
            >
              <span className="text-xl" aria-hidden>{CROPS[c].emoji}</span>
              <span className="text-[11px] font-bold text-ink">
                {t(`crops.${c}`)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm font-bold uppercase tracking-wider text-ink-soft mb-2">
        {t('onboarding.yourSoil')}
      </p>
      <div className="space-y-2 mb-6">
        {(
          [
            ['sand', 'onboarding.soilSandHint'],
            ['loam', 'onboarding.soilLoamHint'],
            ['clay', 'onboarding.soilClayHint'],
          ] as const
        ).map(([s, hint]) => (
          <button
            key={s}
            aria-pressed={soil === s}
            onClick={() => setSoil(s)}
            className={`tap card w-full flex items-center gap-3 px-4 py-3 text-left ${
              soil === s ? 'border-2 border-clay bg-clay-soft/30' : ''
            }`}
          >
            <div className="flex-1">
              <p className="font-bold text-ink text-sm">{t(`soils.${s}`)}</p>
              <p className="text-xs text-ink-soft">{t(hint)}</p>
            </div>
            {soil === s && (
              <Icon name="check" size={18} className="text-clay-strong" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`${t('onboarding.fieldSize')} (${t('common.ha')})`}>
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            step={0.1}
            className={inputCls}
            value={sizeHa}
            onChange={(e) => setSizeHa(parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label={t('onboarding.nameLabel')}>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('onboarding.namePlaceholder')}
          />
        </Field>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* progress dots */}
      <div className="flex justify-center gap-2 pt-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? 'w-8 bg-clay' : 'w-3 bg-line'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 mx-auto w-full max-w-lg px-5 pt-8 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto w-full max-w-lg px-5 pb-8 safe-bottom flex gap-3">
        {step === 0 ? (
          <button
            className="tap px-4 text-sm font-bold text-ink-faint"
            onClick={() => finish(true)}
          >
            {t('onboarding.later')}
          </button>
        ) : (
          <Button variant="secondary" icon="chevronLeft" onClick={() => setStep(step - 1)}>
            {t('common.back')}
          </Button>
        )}
        <div className="flex-1" />
        {step < steps.length - 1 ? (
          <Button size="lg" icon="chevronRight" onClick={() => setStep(step + 1)}>
            {t('common.next')}
          </Button>
        ) : (
          <Button size="lg" icon="check" onClick={() => finish(false)}>
            {t('onboarding.start')}
          </Button>
        )}
      </div>
    </div>
  );
}

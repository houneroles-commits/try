import { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { getGPS, searchPlace, PRESET_LOCATIONS } from '../lib/geo';
import type { GeoPoint } from '../lib/types';
import { CurrentWeatherCard, ForecastStrip, WeatherGlyph, conditionKey } from '../components/WeatherBits';
import { Icon } from '../components/Icon';
import { Button, Field, SectionTitle, Sheet, Skeleton, SourceBadge, inputCls } from '../components/ui';

const RainMap = lazy(() => import('../components/RainMap'));

function agoLabel(iso: string, t: (k: string, o?: any) => string): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 2) return t('common.justNow');
  if (min < 60) return t('common.minAgo', { count: min });
  return t('common.hoursAgo', { count: Math.round(min / 60) });
}

function LocationSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { profile, saveProfile, refreshWeather } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [gpsError, setGpsError] = useState(false);

  const apply = (loc: GeoPoint) => {
    const base = profile ?? {
      name: '',
      location: null,
      crops: [],
      soil: 'loam' as const,
      fieldSizeHa: 1,
      plantingDates: {},
      createdAt: new Date().toISOString(),
    };
    saveProfile({ ...base, location: loc });
    onClose();
    setTimeout(() => void refreshWeather(true), 50);
  };

  const useGps = async () => {
    setBusy(true);
    setGpsError(false);
    try {
      const p = await getGPS();
      apply({ ...p, label: t('weather.location') + ' GPS' });
    } catch {
      setGpsError(true);
    } finally {
      setBusy(false);
    }
  };

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    try {
      setResults(await searchPlace(q));
    } catch {
      setResults([]);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('weather.changeLocation')}>
      <Button full icon="pin" onClick={() => void useGps()} disabled={busy}>
        {busy ? t('common.loading') : t('weather.useGPS')}
      </Button>
      {gpsError && (
        <p className="text-sm text-danger font-semibold mt-2">
          {t('weather.gpsDenied')}
        </p>
      )}
      <Field label={t('common.search')}>
        <input
          className={inputCls}
          value={query}
          onChange={(e) => void search(e.target.value)}
          placeholder={t('weather.searchPlace')}
        />
      </Field>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {(results.length > 0 ? results : PRESET_LOCATIONS).map((loc) => (
          <button
            key={loc.label + loc.lat}
            onClick={() => apply(loc)}
            className="tap w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-surface-2"
          >
            <Icon name="pin" size={17} className="text-clay-strong shrink-0" />
            <span className="font-semibold text-ink text-sm">{loc.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export default function Weather() {
  const { t, i18n } = useTranslation();
  const { weather, weatherLoading, refreshWeather } = useApp();
  const [locOpen, setLocOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  return (
    <div className="mx-auto max-w-lg px-4 pt-5">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold text-ink">{t('weather.title')}</h1>
        <button
          className="tap flex items-center justify-center rounded-full text-ink-soft active:bg-surface-2"
          onClick={() => void refreshWeather(true)}
          aria-label={t('common.retry')}
        >
          <Icon name="refresh" size={19} className={weatherLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* location row */}
      <button
        onClick={() => setLocOpen(true)}
        className="tap flex items-center gap-1.5 text-sm font-semibold text-clay-strong mb-4"
      >
        <Icon name="pin" size={15} />
        {weather?.locationLabel ?? t('weather.location')}
        <Icon name="chevronDown" size={14} />
      </button>

      {weatherLoading && !weather ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-32" />
        </div>
      ) : weather ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <SourceBadge source={weather.source} />
            <span className="text-[11px] font-semibold text-ink-faint">
              {t('common.updatedAgo', { time: agoLabel(weather.fetchedAt, t) })}
            </span>
          </div>
          <CurrentWeatherCard weather={weather} />

          <SectionTitle>{t('weather.forecast7')}</SectionTitle>
          <ForecastStrip daily={weather.daily} />

          {/* day-by-day detail list */}
          <div className="card divide-y divide-line/60 mt-3">
            {weather.daily.map((d) => (
              <div key={d.date} className="flex items-center gap-3 px-4 py-3">
                <span className="w-16 text-sm font-bold text-ink-soft shrink-0">
                  {new Date(d.date + 'T12:00:00').toLocaleDateString(i18n.language, {
                    weekday: 'short',
                    day: 'numeric',
                  })}
                </span>
                <WeatherGlyph code={d.weatherCode} size={22} />
                <span className="flex-1 text-xs font-medium text-ink-soft truncate">
                  {t(conditionKey(d.weatherCode))}
                </span>
                {d.rainMm > 0 && (
                  <span className="text-xs font-bold text-sky">
                    {d.rainMm} mm
                  </span>
                )}
                <span className="text-sm font-bold text-ink w-16 text-right">
                  {d.tMax}°{' '}
                  <span className="text-ink-faint font-semibold">{d.tMin}°</span>
                </span>
              </div>
            ))}
          </div>

          {/* rain map — loads on demand to save data */}
          <SectionTitle>{t('weather.map')}</SectionTitle>
          {showMap ? (
            <div className="card overflow-hidden p-0">
              <Suspense fallback={<Skeleton className="h-[320px] rounded-none" />}>
                <RainMap lat={weather.lat} lon={weather.lon} />
              </Suspense>
              <p className="px-4 py-2 text-[11px] text-ink-faint">
                {t('weather.radarNote')}
              </p>
            </div>
          ) : (
            <Button
              full
              variant="secondary"
              icon="map"
              onClick={() => setShowMap(true)}
            >
              {t('weather.map')}
            </Button>
          )}
        </>
      ) : null}

      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
      <div className="h-6" />
    </div>
  );
}

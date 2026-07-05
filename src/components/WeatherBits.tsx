import { useTranslation } from 'react-i18next';
import type { DailyForecast, WeatherBundle } from '../lib/types';
import { weatherInfo } from '../lib/weather';
import { Icon, type IconName } from './Icon';

const ICON_COLOR: Record<string, string> = {
  sun: 'text-sun',
  sunCloud: 'text-sun',
  cloud: 'text-ink-faint',
  fog: 'text-ink-faint',
  drizzle: 'text-sky',
  rain: 'text-sky',
  snow: 'text-sky',
  storm: 'text-clay-strong',
};

export function WeatherGlyph({ code, size = 24 }: { code: number; size?: number }) {
  const { icon } = weatherInfo(code);
  return <Icon name={icon as IconName} size={size} className={ICON_COLOR[icon]} />;
}

export function conditionKey(code: number): string {
  return `weather.conditions.${weatherInfo(code).key}`;
}

function dayLabel(dateISO: string, t: (k: string) => string, lang: string): string {
  const d = new Date(dateISO + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  if (d.toDateString() === today.toDateString()) return t('common.today');
  if (d.toDateString() === tomorrow.toDateString()) return t('common.tomorrow');
  return d.toLocaleDateString(lang, { weekday: 'short' });
}

export function ForecastStrip({ daily }: { daily: DailyForecast[] }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 snap-x">
      {daily.map((d, i) => (
        <div
          key={d.date}
          className={`card snap-start shrink-0 w-[86px] flex flex-col items-center gap-1 py-3 ${
            i === 0 ? 'border-clay/50' : ''
          }`}
        >
          <span className="text-xs font-bold text-ink-soft">
            {dayLabel(d.date, t, i18n.language)}
          </span>
          <WeatherGlyph code={d.weatherCode} size={26} />
          <span className="text-sm font-bold text-ink">
            {d.tMax}°<span className="text-ink-faint font-semibold"> {d.tMin}°</span>
          </span>
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
              d.rainProb >= 50 ? 'text-sky' : 'text-ink-faint'
            }`}
          >
            <Icon name="drop" size={10} />
            {d.rainProb}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function CurrentWeatherCard({ weather }: { weather: WeatherBundle }) {
  const { t } = useTranslation();
  const c = weather.current;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-4 flex-wrap">
        <WeatherGlyph code={c.weatherCode} size={52} />
        <div className="flex-1">
          <div className="text-4xl font-extrabold text-ink leading-none">
            {c.temp}°C
          </div>
          <div className="text-sm text-ink-soft font-medium mt-1">
            {t(conditionKey(c.weatherCode))}
          </div>
        </div>
        <div className="text-right text-xs text-ink-soft space-y-1.5 font-medium">
          <div className="flex items-center gap-1.5 justify-end">
            <Icon name="humidity" size={13} className="text-sky" />
            {c.humidity}%
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Icon name="wind" size={13} className="text-ink-faint" />
            {c.windSpeed} km/h
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Icon name="sun" size={13} className="text-sun" />
            {t('weather.feelsLike')} {c.feelsLike}°
          </div>
        </div>
      </div>
    </div>
  );
}

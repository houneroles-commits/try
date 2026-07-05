/**
 * Open-Meteo client (free, no key) with a three-level fallback that can
 * never look broken: live → last-known cache → labeled demo data.
 */
import type { WeatherBundle, GeoPoint } from './types';
import { demoWeather } from './demo';
import { KEYS, load, save } from './storage';

const BASE = 'https://api.open-meteo.com/v1/forecast';

function buildUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
    hourly:
      'temperature_2m,precipitation,precipitation_probability,soil_moisture_0_to_7cm',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration',
    forecast_days: '7',
    forecast_hours: '48',
    timezone: 'auto',
  });
  return `${BASE}?${p.toString()}`;
}

function parse(json: any, loc: GeoPoint): WeatherBundle {
  const d = json.daily;
  const h = json.hourly;
  const c = json.current;
  return {
    current: {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: Math.round(c.relative_humidity_2m),
      windSpeed: Math.round(c.wind_speed_10m),
      weatherCode: c.weather_code,
      isDay: c.is_day === 1,
      time: c.time,
    },
    daily: d.time.map((date: string, i: number) => ({
      date,
      tMax: Math.round(d.temperature_2m_max[i]),
      tMin: Math.round(d.temperature_2m_min[i]),
      rainMm: Math.round((d.precipitation_sum[i] ?? 0) * 10) / 10,
      rainProb: d.precipitation_probability_max?.[i] ?? 0,
      weatherCode: d.weather_code[i],
      windMax: Math.round(d.wind_speed_10m_max[i]),
      et0: Math.round((d.et0_fao_evapotranspiration?.[i] ?? 4) * 10) / 10,
    })),
    hourly: h.time.map((time: string, i: number) => ({
      time,
      temp: Math.round(h.temperature_2m[i]),
      rainMm: Math.round((h.precipitation[i] ?? 0) * 10) / 10,
      rainProb: h.precipitation_probability?.[i] ?? 0,
      soilMoisture: h.soil_moisture_0_to_7cm?.[i] ?? 0,
    })),
    fetchedAt: new Date().toISOString(),
    source: 'live',
    locationLabel: loc.label,
    lat: loc.lat,
    lon: loc.lon,
  };
}

/**
 * Fetch weather with fallbacks. Returns quickly from cache if the cache is
 * fresh (< 30 min) to save data; pass `force` to bypass.
 */
export async function getWeather(
  loc: GeoPoint | null,
  opts: { force?: boolean; dataSaver?: boolean } = {},
): Promise<WeatherBundle> {
  const cached = load<WeatherBundle | null>(KEYS.weatherCache, null);
  const target: GeoPoint = loc ?? {
    lat: cached?.lat ?? -26.2,
    lon: cached?.lon ?? 28.04,
    label: cached?.locationLabel ?? 'Johannesburg',
  };

  const sameSpot =
    cached &&
    Math.abs(cached.lat - target.lat) < 0.05 &&
    Math.abs(cached.lon - target.lon) < 0.05;

  if (cached && sameSpot && !opts.force) {
    const ageMin = (Date.now() - Date.parse(cached.fetchedAt)) / 60000;
    const maxAge = opts.dataSaver ? 180 : 30;
    if (ageMin < maxAge) return { ...cached, source: 'cache' };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(buildUrl(target.lat, target.lon), {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const bundle = parse(await res.json(), target);
    save(KEYS.weatherCache, bundle);
    return bundle;
  } catch {
    if (cached && sameSpot) return { ...cached, source: 'cache' };
    if (cached) return { ...cached, source: 'cache' };
    return demoWeather(target.lat, target.lon, target.label);
  }
}

/** WMO weather code → icon name + i18n key suffix. */
export function weatherInfo(code: number): { icon: string; key: string } {
  if (code === 0) return { icon: 'sun', key: 'clear' };
  if (code <= 2) return { icon: 'sunCloud', key: 'partly' };
  if (code === 3) return { icon: 'cloud', key: 'cloudy' };
  if (code === 45 || code === 48) return { icon: 'fog', key: 'fog' };
  if (code >= 51 && code <= 57) return { icon: 'drizzle', key: 'drizzle' };
  if (code >= 61 && code <= 67) return { icon: 'rain', key: 'rain' };
  if (code >= 71 && code <= 77) return { icon: 'snow', key: 'snow' };
  if (code >= 80 && code <= 82) return { icon: 'rain', key: 'showers' };
  if (code >= 95) return { icon: 'storm', key: 'storm' };
  return { icon: 'cloud', key: 'cloudy' };
}

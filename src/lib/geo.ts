import type { GeoPoint } from './types';

/** Common fallback locations for manual selection (offline-friendly). */
export const PRESET_LOCATIONS: GeoPoint[] = [
  { label: 'Johannesburg, ZA', lat: -26.2041, lon: 28.0473 },
  { label: 'Durban, ZA', lat: -29.8587, lon: 31.0218 },
  { label: 'Cape Town, ZA', lat: -33.9249, lon: 18.4241 },
  { label: 'Polokwane, ZA', lat: -23.9045, lon: 29.4689 },
  { label: 'Nelspruit, ZA', lat: -25.4753, lon: 30.9694 },
  { label: 'Bloemfontein, ZA', lat: -29.0852, lon: 26.1596 },
  { label: 'Maseru, LS', lat: -29.3151, lon: 27.4869 },
  { label: 'Gaborone, BW', lat: -24.6282, lon: 25.9231 },
  { label: 'Harare, ZW', lat: -17.8252, lon: 31.0335 },
  { label: 'Lusaka, ZM', lat: -15.3875, lon: 28.3228 },
  { label: 'Nairobi, KE', lat: -1.2921, lon: 36.8219 },
  { label: 'Lagos, NG', lat: 6.5244, lon: 3.3792 },
];

export function getGPS(timeoutMs = 12000): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lon: Math.round(pos.coords.longitude * 10000) / 10000,
          label: 'GPS',
        }),
      (err) => reject(err),
      { timeout: timeoutMs, maximumAge: 600000, enableHighAccuracy: false },
    );
  });
}

/** Free Open-Meteo geocoder — no key required. */
export async function searchPlace(query: string): Promise<GeoPoint[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query,
  )}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  return (json.results ?? []).map((r: any) => ({
    lat: r.latitude,
    lon: r.longitude,
    label: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
  }));
}

/**
 * Hub helpers for the leader dashboard: geocoding (free Open-Meteo), a
 * lightweight per-farmer rain check, and per-farmer record storage.
 */
import { KEYS, load, save, uid } from './storage';
import type { FarmRecord, HubFarmer } from './types';

/* ---------------------------------------------------- Farmer roster */
export function loadFarmers(): HubFarmer[] {
  return load(KEYS.hubFarmers, [] as HubFarmer[]);
}
export function saveFarmers(list: HubFarmer[]): void {
  save(KEYS.hubFarmers, list);
}
export function getFarmer(id: string): HubFarmer | undefined {
  return loadFarmers().find((f) => f.id === id);
}

/* ---------------------------------------------------- Geocoding (free) */
export async function geocode(
  name: string,
): Promise<{ lat: number; lon: number; label: string } | null> {
  if (!name.trim()) return null;
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        name,
      )}&count=1&language=en&format=json`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    const g = j?.results?.[0];
    if (!g) return null;
    return {
      lat: g.latitude,
      lon: g.longitude,
      label: [g.name, g.admin1, g.country].filter(Boolean).join(', '),
    };
  } catch {
    return null;
  }
}

/* ---------------------------------------------------- Per-farmer rain */
export type FarmerStatus = 'rain' | 'dry' | 'unknown';
const RAIN_MM = 10;

/** mm of likely rain (prob ≥ 50%) over the next 2 days. */
export async function rainNext48h(lat: number, lon: number): Promise<number> {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max&forecast_days=2&timezone=auto`,
  );
  if (!r.ok) throw new Error('weather');
  const j = await r.json();
  const sums: number[] = j.daily?.precipitation_sum ?? [];
  const probs: number[] = j.daily?.precipitation_probability_max ?? [];
  let mm = 0;
  for (let i = 0; i < sums.length; i++) if ((probs[i] ?? 0) >= 50) mm += sums[i] ?? 0;
  return Math.round(mm);
}

export function statusFromRain(mm: number): FarmerStatus {
  return mm >= RAIN_MM ? 'rain' : 'dry';
}

/* ---------------------------------------------------- Per-farmer records */
type RecordMap = Record<string, FarmRecord[]>;

export function getRecords(farmerId: string): FarmRecord[] {
  return (load(KEYS.hubRecords, {} as RecordMap)[farmerId] ?? []) as FarmRecord[];
}
export function addRecord(farmerId: string, rec: Omit<FarmRecord, 'id'>): FarmRecord[] {
  const all = load(KEYS.hubRecords, {} as RecordMap);
  all[farmerId] = [{ ...rec, id: uid() }, ...(all[farmerId] ?? [])];
  save(KEYS.hubRecords, all);
  return all[farmerId];
}
export function deleteRecord(farmerId: string, id: string): FarmRecord[] {
  const all = load(KEYS.hubRecords, {} as RecordMap);
  all[farmerId] = (all[farmerId] ?? []).filter((r) => r.id !== id);
  save(KEYS.hubRecords, all);
  return all[farmerId];
}

/* ---------------------------------------------------- CSV export */
export function downloadFarmersCSV(farmers: HubFarmer[]): void {
  const headers = ['Name', 'Crop', 'Location', 'Field size (ha)', 'Phone', 'Note'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = farmers.map((f) => [f.name, f.crop, f.location, f.fieldSizeHa, f.phone, f.note]);
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lima-farmers.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------- Avatar colours */
const AVATAR = ['bg-clay', 'bg-sun', 'bg-sky', 'bg-umber', 'bg-clay-strong'];
export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR.length;
  return AVATAR[h];
}
export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

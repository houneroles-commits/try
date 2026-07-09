/** Tiny namespaced localStorage helpers — every persisted key lives here. */

const NS = 'lima.';

export const KEYS = {
  settings: NS + 'settings',
  profile: NS + 'profile',
  records: NS + 'records',
  weatherCache: NS + 'weather',
  chat: NS + 'chat',
  lastWatered: NS + 'lastWatered',
  installDismissed: NS + 'installDismissed',
  finances: NS + 'finances',
  hubFarmers: NS + 'hubFarmers',
  hubRecords: NS + 'hubRecords',
  hubTourSeen: NS + 'hubTourSeen',
} as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — app keeps working from memory
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

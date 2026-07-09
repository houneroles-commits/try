/**
 * Hub cloud sync. Provides a `CloudApi` (talking to the server, authed with the
 * Clerk session token) ONLY when a leader is signed in and a backend URL is set.
 * Otherwise `useCloud()` returns null and the Hub falls back to local storage.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { FarmRecord, HubFarmer } from './types';

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '';

export interface CloudApi {
  getState(): Promise<{ farmers: HubFarmer[]; records: Record<string, FarmRecord[]> }>;
  upsertFarmer(f: HubFarmer): Promise<void>;
  deleteFarmer(id: string): Promise<void>;
  saveRecords(farmerId: string, records: FarmRecord[]): Promise<void>;
}

const CloudContext = createContext<CloudApi | null>(null);
export const useCloud = () => useContext(CloudContext);

function makeApi(getToken: () => Promise<string | null>): CloudApi {
  async function authFetch(path: string, opts: RequestInit = {}) {
    const token = await getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error(`cloud ${res.status}`);
    return res;
  }
  return {
    getState: () => authFetch('/api/hub/state').then((r) => r.json()),
    upsertFarmer: (f) => authFetch(`/api/hub/farmers/${f.id}`, { method: 'PUT', body: JSON.stringify(f) }).then(() => undefined),
    deleteFarmer: (id) => authFetch(`/api/hub/farmers/${id}`, { method: 'DELETE' }).then(() => undefined),
    saveRecords: (farmerId, records) =>
      authFetch(`/api/hub/records/${farmerId}`, { method: 'PUT', body: JSON.stringify({ records }) }).then(() => undefined),
  };
}

/** Used when Clerk IS configured — builds the API from the signed-in session. */
export function ClerkCloudProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const cloud = useMemo(
    () => (isSignedIn && API_BASE ? makeApi(getToken) : null),
    [isSignedIn, getToken],
  );
  return <CloudContext.Provider value={cloud}>{children}</CloudContext.Provider>;
}

/** Used when Clerk is NOT configured — no cloud, always local storage. */
export function NoCloudProvider({ children }: { children: ReactNode }) {
  return <CloudContext.Provider value={null}>{children}</CloudContext.Provider>;
}

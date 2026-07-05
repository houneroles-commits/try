import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import i18n from '../i18n';
import type {
  FarmProfile,
  FarmRecord,
  Settings,
  WeatherBundle,
} from '../lib/types';
import { KEYS, load, save, uid } from '../lib/storage';
import { getWeather } from '../lib/weather';

const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  theme: 'system',
  show3D: false, // 3D is opt-in — fast & low-data first
  dataSaver: false,
  voiceReplies: false,
  onboarded: false,
};

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  profile: FarmProfile | null;
  saveProfile: (p: FarmProfile) => void;
  clearAll: () => void;
  records: FarmRecord[];
  addRecord: (r: Omit<FarmRecord, 'id'>) => void;
  deleteRecord: (id: string) => void;
  lastWatered: string;
  setLastWatered: (iso: string) => void;
  weather: WeatherBundle | null;
  weatherLoading: boolean;
  refreshWeather: (force?: boolean) => Promise<void>;
  online: boolean;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() =>
    load(KEYS.settings, DEFAULT_SETTINGS),
  );
  const [profile, setProfile] = useState<FarmProfile | null>(() =>
    load(KEYS.profile, null),
  );
  const [records, setRecords] = useState<FarmRecord[]>(() =>
    load(KEYS.records, [] as FarmRecord[]),
  );
  const [lastWatered, setLastWateredState] = useState<string>(() =>
    load(KEYS.lastWatered, new Date(Date.now() - 3 * 86400000).toISOString()),
  );
  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  // --- language ----------------------------------------------------------
  useEffect(() => {
    if (i18n.language !== settings.language) {
      void i18n.changeLanguage(settings.language);
    }
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  // --- theme -------------------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark =
        settings.theme === 'dark' || (settings.theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);

  // --- connectivity ------------------------------------------------------
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // --- weather -----------------------------------------------------------
  const refreshWeather = useCallback(
    async (force = false) => {
      setWeatherLoading(true);
      try {
        const bundle = await getWeather(profile?.location ?? null, {
          force,
          dataSaver: settings.dataSaver,
        });
        setWeather(bundle);
      } finally {
        setWeatherLoading(false);
      }
    },
    [profile?.location, settings.dataSaver],
  );

  useEffect(() => {
    void refreshWeather();
  }, [refreshWeather]);

  // --- mutations ---------------------------------------------------------
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(KEYS.settings, next);
      return next;
    });
  }, []);

  const saveProfile = useCallback((p: FarmProfile) => {
    setProfile(p);
    save(KEYS.profile, p);
  }, []);

  const addRecord = useCallback((r: Omit<FarmRecord, 'id'>) => {
    setRecords((prev) => {
      const next = [...prev, { ...r, id: uid() }];
      save(KEYS.records, next);
      return next;
    });
    if (r.kind === 'irrigation') {
      const iso = new Date(r.date).toISOString();
      setLastWateredState(iso);
      save(KEYS.lastWatered, iso);
    }
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      save(KEYS.records, next);
      return next;
    });
  }, []);

  const setLastWatered = useCallback((iso: string) => {
    setLastWateredState(iso);
    save(KEYS.lastWatered, iso);
  }, []);

  const clearAll = useCallback(() => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    window.location.href = '/';
  }, []);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      profile,
      saveProfile,
      clearAll,
      records,
      addRecord,
      deleteRecord,
      lastWatered,
      setLastWatered,
      weather,
      weatherLoading,
      refreshWeather,
      online,
    }),
    [
      settings,
      updateSettings,
      profile,
      saveProfile,
      clearAll,
      records,
      addRecord,
      deleteRecord,
      lastWatered,
      setLastWatered,
      weather,
      weatherLoading,
      refreshWeather,
      online,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

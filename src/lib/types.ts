export type Language = 'en' | 'sw' | 'zu' | 'st' | 'af';
export type ThemeMode = 'light' | 'dark' | 'system';
export type TextSize = 'normal' | 'large';
export type AppMode = 'personal' | 'hub';

/** A farmer managed by a Hub Leader (for farmers without their own phone). */
export interface HubFarmer {
  id: string;
  name: string;
  crop: CropId;
  location: string;
  lat?: number;
  lon?: number;
  fieldSizeHa: number;
  phone?: string;
  note?: string;
  createdAt: string;
}

export type CropId =
  | 'maize'
  | 'beans'
  | 'tomato'
  | 'spinach'
  | 'potato'
  | 'cabbage'
  | 'onion'
  | 'sorghum';

export type SoilId = 'sand' | 'loam' | 'clay';

export interface GeoPoint {
  lat: number;
  lon: number;
  label: string;
}

export interface FarmProfile {
  name: string;
  location: GeoPoint | null;
  crops: CropId[];
  soil: SoilId;
  fieldSizeHa: number;
  /** ISO planting date per crop, if known */
  plantingDates: Partial<Record<CropId, string>>;
  createdAt: string;
}

export interface Settings {
  language: Language;
  theme: ThemeMode;
  show3D: boolean;
  dataSaver: boolean;
  voiceReplies: boolean;
  onboarded: boolean;
  dashboardTourSeen?: boolean;
  textSize?: TextSize;
  highContrast?: boolean;
  appMode?: AppMode; // unset = show the choice screen on open
}

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  time: string;
}

export interface DailyForecast {
  date: string;
  tMax: number;
  tMin: number;
  rainMm: number;
  rainProb: number;
  weatherCode: number;
  windMax: number;
  /** FAO reference evapotranspiration, mm/day */
  et0: number;
}

export interface HourlyPoint {
  time: string;
  temp: number;
  rainMm: number;
  rainProb: number;
  /** m³/m³ topsoil moisture 0–7 cm */
  soilMoisture: number;
}

export type WeatherSource = 'live' | 'cache' | 'demo';

export interface WeatherBundle {
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyPoint[];
  fetchedAt: string;
  source: WeatherSource;
  locationLabel: string;
  lat: number;
  lon: number;
}

export type RecordKind = 'irrigation' | 'rain' | 'harvest';

export interface FarmRecord {
  id: string;
  kind: RecordKind;
  /** ISO date */
  date: string;
  /** mm for irrigation/rain, kg for harvest */
  amount: number;
  crop?: CropId;
  note?: string;
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** data-URL preview of an attached photo */
  image?: string;
  time: string;
  demo?: boolean;
  error?: boolean;
}

export type IrrigationAction = 'irrigate' | 'skip_rain' | 'wait';

export interface IrrigationAdvice {
  action: IrrigationAction;
  /** recommended application, mm */
  mm: number;
  /** litres for the whole field */
  litres: number;
  /** days until next check when action = wait */
  daysUntilCheck: number;
  /** expected rain over next 48 h (probability-filtered), mm */
  rain48: number;
  /** current soil-water deficit, mm */
  deficit: number;
  /** readily-available-water threshold for this soil/crop, mm */
  threshold: number;
  /** crop water use today, mm/day */
  etc: number;
  crop: CropId;
  source: WeatherSource;
}

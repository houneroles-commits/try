/**
 * Irrigation decision engine — a simple, transparent soil-water balance.
 *
 * Model (documented in PROGRESS.md):
 *   bucket size  TAW  = soil AWC (mm/m) × root depth (m)
 *   threshold    RAW  = TAW × 0.5      (readily available water, FAO p≈0.5)
 *   crop use     ETc  = ET0 × Kc       (per day; ET0 from Open-Meteo)
 *   deficit      D    = Σ over days since last watered of (ETc − 0.7×rain)
 *   rain ahead   R48  = Σ next-48h forecast rain where probability ≥ 50%
 *
 * Decision:
 *   R48 covers ≥60% of deficit and deficit < RAW×1.2  → SKIP (rain coming)
 *   deficit ≥ RAW                                     → IRRIGATE ≈ deficit − R48
 *   otherwise                                         → WAIT (recheck in N days)
 */
import type {
  CropId,
  FarmRecord,
  IrrigationAdvice,
  SoilId,
  WeatherBundle,
} from './types';
import {
  CROPS,
  DEPLETION_FRACTION,
  SOIL_AWC_MM_PER_M,
  cropStatus,
  defaultKc,
} from './season';

export interface IrrigationInput {
  crop: CropId;
  soil: SoilId;
  fieldSizeHa: number;
  /** ISO date of last irrigation or soaking rain */
  lastWatered: string;
  plantingDate?: string;
  weather: WeatherBundle;
  /** rain the farmer recorded themselves (mm since lastWatered) */
  records?: FarmRecord[];
}

function daysBetween(fromISO: string, to: Date = new Date()): number {
  return Math.max(
    0,
    Math.floor((to.getTime() - Date.parse(fromISO)) / 86400000),
  );
}

export function adviseIrrigation(input: IrrigationInput): IrrigationAdvice {
  const { crop, soil, weather } = input;
  const info = CROPS[crop];

  const kc = input.plantingDate
    ? cropStatus(crop, input.plantingDate).kc
    : defaultKc(crop);

  const taw = SOIL_AWC_MM_PER_M[soil] * info.rootDepthM;
  const raw = taw * DEPLETION_FRACTION;

  const et0Today = weather.daily[0]?.et0 ?? 4.5;
  const etc = Math.round(et0Today * kc * 10) / 10;

  // --- deficit accumulated since last watering -------------------------
  const days = Math.min(daysBetween(input.lastWatered), 30);
  let deficit = 0;
  for (let i = 0; i < days; i++) {
    // Past days: assume today's ET as a proxy (Open-Meteo free tier gives
    // forecast, not history) minus effective rain the farmer recorded.
    deficit += et0Today * kc;
  }
  const recordedRain = (input.records ?? [])
    .filter(
      (r) =>
        r.kind === 'rain' && Date.parse(r.date) >= Date.parse(input.lastWatered),
    )
    .reduce((sum, r) => sum + r.amount, 0);
  deficit = Math.max(0, deficit - 0.7 * recordedRain);
  deficit = Math.min(deficit, taw); // bucket can't be emptier than empty
  deficit = Math.round(deficit * 10) / 10;

  // --- forecast rain over next 48 h ------------------------------------
  const rain48 = Math.round(
    weather.daily
      .slice(0, 2)
      .filter((d) => d.rainProb >= 50)
      .reduce((sum, d) => sum + d.rainMm, 0) * 10,
  ) / 10;

  const litresPerMm = input.fieldSizeHa * 10000; // 1 mm over 1 ha = 10 000 L

  // --- decide -----------------------------------------------------------
  if (rain48 >= deficit * 0.6 && deficit < raw * 1.2 && rain48 >= 5) {
    return {
      action: 'skip_rain',
      mm: 0,
      litres: 0,
      daysUntilCheck: 2,
      rain48,
      deficit,
      threshold: Math.round(raw),
      etc,
      crop,
      source: weather.source,
    };
  }

  if (deficit >= raw) {
    const mm = Math.max(5, Math.round((deficit - rain48 * 0.7) / 5) * 5);
    return {
      action: 'irrigate',
      mm,
      litres: Math.round(mm * litresPerMm),
      daysUntilCheck: 0,
      rain48,
      deficit,
      threshold: Math.round(raw),
      etc,
      crop,
      source: weather.source,
    };
  }

  const daysLeft = Math.max(1, Math.ceil((raw - deficit) / Math.max(etc, 0.5)));
  return {
    action: 'wait',
    mm: 0,
    litres: 0,
    daysUntilCheck: Math.min(daysLeft, 7),
    rain48,
    deficit,
    threshold: Math.round(raw),
    etc,
    crop,
    source: weather.source,
  };
}

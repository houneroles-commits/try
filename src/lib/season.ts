/**
 * Crop calendar + coefficients for the season calendar and the irrigation
 * engine. Values are FAO-56 style approximations tuned for Southern-African
 * smallholder conditions — sensible, transparent, not lab-grade
 * (assumptions documented in PROGRESS.md).
 */
import type { CropId, SoilId } from './types';

export interface CropStage {
  key: 'initial' | 'development' | 'mid' | 'late';
  days: number;
  kc: number;
}

export interface CropInfo {
  id: CropId;
  emoji: string;
  /** planting window months (1–12), Southern-Hemisphere summer default */
  plantMonths: number[];
  stages: CropStage[];
  daysToHarvest: number;
  /** typical rooting depth used for the water-balance bucket, metres */
  rootDepthM: number;
}

export const CROPS: Record<CropId, CropInfo> = {
  maize: {
    id: 'maize',
    emoji: '🌽',
    plantMonths: [10, 11, 12],
    stages: [
      { key: 'initial', days: 20, kc: 0.4 },
      { key: 'development', days: 35, kc: 0.8 },
      { key: 'mid', days: 40, kc: 1.15 },
      { key: 'late', days: 30, kc: 0.7 },
    ],
    daysToHarvest: 125,
    rootDepthM: 0.6,
  },
  beans: {
    id: 'beans',
    emoji: '🫘',
    plantMonths: [10, 11, 12, 1],
    stages: [
      { key: 'initial', days: 15, kc: 0.4 },
      { key: 'development', days: 25, kc: 0.75 },
      { key: 'mid', days: 30, kc: 1.1 },
      { key: 'late', days: 15, kc: 0.6 },
    ],
    daysToHarvest: 85,
    rootDepthM: 0.4,
  },
  tomato: {
    id: 'tomato',
    emoji: '🍅',
    plantMonths: [8, 9, 10, 11],
    stages: [
      { key: 'initial', days: 25, kc: 0.5 },
      { key: 'development', days: 35, kc: 0.85 },
      { key: 'mid', days: 45, kc: 1.15 },
      { key: 'late', days: 25, kc: 0.8 },
    ],
    daysToHarvest: 130,
    rootDepthM: 0.5,
  },
  spinach: {
    id: 'spinach',
    emoji: '🥬',
    plantMonths: [2, 3, 4, 8, 9],
    stages: [
      { key: 'initial', days: 10, kc: 0.5 },
      { key: 'development', days: 15, kc: 0.75 },
      { key: 'mid', days: 20, kc: 1.0 },
      { key: 'late', days: 5, kc: 0.9 },
    ],
    daysToHarvest: 50,
    rootDepthM: 0.3,
  },
  potato: {
    id: 'potato',
    emoji: '🥔',
    plantMonths: [8, 9, 10, 1, 2],
    stages: [
      { key: 'initial', days: 25, kc: 0.5 },
      { key: 'development', days: 30, kc: 0.8 },
      { key: 'mid', days: 40, kc: 1.15 },
      { key: 'late', days: 25, kc: 0.75 },
    ],
    daysToHarvest: 120,
    rootDepthM: 0.4,
  },
  cabbage: {
    id: 'cabbage',
    emoji: '🥦',
    plantMonths: [1, 2, 3, 7, 8],
    stages: [
      { key: 'initial', days: 20, kc: 0.45 },
      { key: 'development', days: 30, kc: 0.8 },
      { key: 'mid', days: 40, kc: 1.05 },
      { key: 'late', days: 15, kc: 0.9 },
    ],
    daysToHarvest: 105,
    rootDepthM: 0.4,
  },
  onion: {
    id: 'onion',
    emoji: '🧅',
    plantMonths: [2, 3, 4],
    stages: [
      { key: 'initial', days: 20, kc: 0.5 },
      { key: 'development', days: 35, kc: 0.75 },
      { key: 'mid', days: 60, kc: 1.05 },
      { key: 'late', days: 30, kc: 0.8 },
    ],
    daysToHarvest: 145,
    rootDepthM: 0.3,
  },
  sorghum: {
    id: 'sorghum',
    emoji: '🌾',
    plantMonths: [11, 12, 1],
    stages: [
      { key: 'initial', days: 20, kc: 0.35 },
      { key: 'development', days: 30, kc: 0.75 },
      { key: 'mid', days: 40, kc: 1.05 },
      { key: 'late', days: 30, kc: 0.6 },
    ],
    daysToHarvest: 120,
    rootDepthM: 0.7,
  },
};

export const CROP_IDS = Object.keys(CROPS) as CropId[];

/** Plant-available water capacity by soil texture, mm of water per m of soil. */
export const SOIL_AWC_MM_PER_M: Record<SoilId, number> = {
  sand: 70,
  loam: 140,
  clay: 170,
};

/** Fraction of available water a crop can use before stress (FAO p-factor). */
export const DEPLETION_FRACTION = 0.5;

export interface CropStatus {
  crop: CropId;
  stage: CropStage;
  stageIndex: number;
  dayOfSeason: number;
  progress: number; // 0..1 of full season
  harvestDate: string;
  daysToHarvest: number;
  kc: number;
}

export function cropStatus(crop: CropId, plantingDateISO: string): CropStatus {
  const info = CROPS[crop];
  const planted = Date.parse(plantingDateISO);
  const dayOfSeason = Math.max(
    0,
    Math.floor((Date.now() - planted) / 86400000),
  );
  let acc = 0;
  let stage = info.stages[info.stages.length - 1];
  let stageIndex = info.stages.length - 1;
  for (let i = 0; i < info.stages.length; i++) {
    acc += info.stages[i].days;
    if (dayOfSeason < acc) {
      stage = info.stages[i];
      stageIndex = i;
      break;
    }
  }
  const harvest = new Date(planted + info.daysToHarvest * 86400000);
  return {
    crop,
    stage,
    stageIndex,
    dayOfSeason,
    progress: Math.min(1, dayOfSeason / info.daysToHarvest),
    harvestDate: harvest.toISOString().slice(0, 10),
    daysToHarvest: Math.max(
      0,
      Math.ceil((harvest.getTime() - Date.now()) / 86400000),
    ),
    kc: stage.kc,
  };
}

/** Mid-season Kc used when no planting date is known. */
export function defaultKc(crop: CropId): number {
  return CROPS[crop].stages[2].kc;
}

/** Is `month` (1-12) inside the crop's planting window? */
export function isPlantingMonth(crop: CropId, month: number): boolean {
  return CROPS[crop].plantMonths.includes(month);
}

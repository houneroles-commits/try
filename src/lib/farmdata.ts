/**
 * Offline seed data for the Wave-2 tools: fertilizer rates, market prices,
 * a pest/disease library, and crop-stage reminders. All INDICATIVE and meant
 * to be edited/replaced with a live source later — kept here so the tools work
 * fully offline. Prices in KES; fertilizer rates in kg per hectare.
 */
import type { CropId } from './types';

/* ---------------------------------------------------- Fertilizer rates */
export interface FertPlan {
  basal: { name: string; kgPerHa: number }; // at planting
  topDress: { name: string; kgPerHa: number }; // during growth
  note: string;
}

export const FERTILIZER: Record<CropId, FertPlan> = {
  maize:   { basal: { name: 'DAP', kgPerHa: 50 },  topDress: { name: 'CAN', kgPerHa: 100 }, note: 'Top-dress when knee-high and again before tasseling.' },
  beans:   { basal: { name: 'DAP', kgPerHa: 100 }, topDress: { name: 'CAN', kgPerHa: 0 },   note: 'Beans fix their own nitrogen — little or no top-dressing needed.' },
  tomato:  { basal: { name: 'DAP', kgPerHa: 200 }, topDress: { name: 'CAN', kgPerHa: 200 }, note: 'Split top-dressing: at flowering and at first fruit set.' },
  spinach: { basal: { name: 'DAP', kgPerHa: 100 }, topDress: { name: 'CAN', kgPerHa: 100 }, note: 'Top-dress lightly after each cutting.' },
  potato:  { basal: { name: 'DAP', kgPerHa: 250 }, topDress: { name: 'CAN', kgPerHa: 150 }, note: 'Top-dress at earthing-up (about 4 weeks).' },
  cabbage: { basal: { name: 'DAP', kgPerHa: 150 }, topDress: { name: 'CAN', kgPerHa: 200 }, note: 'Split top-dressing at 3 and 6 weeks.' },
  onion:   { basal: { name: 'DAP', kgPerHa: 100 }, topDress: { name: 'CAN', kgPerHa: 150 }, note: 'Stop nitrogen once bulbs start swelling.' },
  sorghum: { basal: { name: 'DAP', kgPerHa: 50 },  topDress: { name: 'CAN', kgPerHa: 50 },  note: 'Top-dress about 4–5 weeks after emergence.' },
};

/* ---------------------------------------------------- Market prices */
export interface CropPrice {
  unit: string;
  markets: Record<string, number>;
}

export const PRICES: { updated: string; currency: string; crops: Partial<Record<CropId, CropPrice>> } = {
  updated: '2026-07-01',
  currency: 'KES',
  crops: {
    maize:   { unit: 'per 90kg bag', markets: { Nairobi: 4200, Nakuru: 3800, Eldoret: 3500, Mombasa: 4600, Kisumu: 3900 } },
    beans:   { unit: 'per 90kg bag', markets: { Nairobi: 9500, Nakuru: 8800, Eldoret: 8500, Mombasa: 10000 } },
    tomato:  { unit: 'per crate',    markets: { Nairobi: 4500, Nakuru: 4000, Mombasa: 5200 } },
    potato:  { unit: 'per 50kg bag', markets: { Nairobi: 3200, Nakuru: 2800, Eldoret: 2600 } },
    cabbage: { unit: 'per head',     markets: { Nairobi: 40, Nakuru: 30, Mombasa: 50 } },
    onion:   { unit: 'per kg',       markets: { Nairobi: 80, Mombasa: 90, Kisumu: 75 } },
    spinach: { unit: 'per kg',       markets: { Nairobi: 40, Nakuru: 30 } },
    sorghum: { unit: 'per 90kg bag', markets: { Nairobi: 4000, Kisumu: 3600, Eldoret: 3400 } },
  },
};

/* ---------------------------------------------------- Pest & disease library */
export interface PestEntry {
  id: string;
  emoji: string;
  name: string;
  crops: CropId[];
  symptoms: string;
  treatment: string;
}

export const PESTS: PestEntry[] = [
  { id: 'fall-armyworm', emoji: '🐛', name: 'Fall armyworm', crops: ['maize', 'sorghum'],
    symptoms: 'Ragged holes and "windowpane" patches on leaves; moist sawdust-like frass in the funnel.',
    treatment: 'Scout weekly. Handpick caterpillars early morning. Put a pinch of dry soil or wood ash into the funnel. Neem spray helps early.' },
  { id: 'stalk-borer', emoji: '🌽', name: 'Maize stalk borer', crops: ['maize', 'sorghum'],
    symptoms: 'Small holes in the stem, a dead central leaf ("deadheart"), tunnels in the stalk.',
    treatment: 'Destroy old crop residues after harvest. Try push-pull (desmodium + napier). Ash in the funnel early.' },
  { id: 'aphids', emoji: '🦟', name: 'Aphids', crops: ['beans', 'tomato', 'cabbage', 'spinach', 'onion'],
    symptoms: 'Sticky, curled leaves; clusters of tiny green/black insects under leaves and on shoots.',
    treatment: 'Spray with soapy water or neem. Encourage ladybirds. Remove badly infested shoots.' },
  { id: 'late-blight', emoji: '🍂', name: 'Late blight', crops: ['potato', 'tomato'],
    symptoms: 'Dark water-soaked spots on leaves and stems; white mould underneath in wet weather. Spreads fast.',
    treatment: 'Remove and bury affected plants. Avoid wetting leaves; water at the base. Use copper spray and resistant varieties.' },
  { id: 'early-blight', emoji: '🎯', name: 'Early blight', crops: ['tomato', 'potato'],
    symptoms: 'Brown spots with concentric rings ("target") on older lower leaves; leaves yellow and drop.',
    treatment: 'Remove lower affected leaves. Mulch to stop soil splash. Rotate crops. Copper spray if severe.' },
  { id: 'bacterial-wilt', emoji: '💧', name: 'Bacterial wilt', crops: ['tomato', 'potato'],
    symptoms: 'Sudden wilting with leaves still green; brown stem; milky ooze when cut stem is put in water.',
    treatment: 'Uproot and burn affected plants. Do not plant tomato/potato there for 2–3 seasons. Avoid waterlogging.' },
  { id: 'cutworm', emoji: '🌙', name: 'Cutworms', crops: ['maize', 'beans', 'tomato', 'cabbage', 'spinach'],
    symptoms: 'Young seedlings cut off at the base overnight; plants lying on the soil in the morning.',
    treatment: 'Put a paper/tin collar around stems. Handpick at night with a torch. Hoe soil to expose them; wood ash around plants.' },
  { id: 'diamondback', emoji: '🥬', name: 'Diamondback moth', crops: ['cabbage'],
    symptoms: 'Small "shot-hole" holes; slim green caterpillars that wriggle when touched.',
    treatment: 'Spray neem or Bt. Intercrop with onions/tomato. Remove crop debris after harvest.' },
  { id: 'whitefly', emoji: '🦋', name: 'Whitefly', crops: ['tomato', 'cabbage'],
    symptoms: 'Clouds of tiny white flies when disturbed; sticky sooty leaves; can spread viruses.',
    treatment: 'Hang yellow sticky traps. Spray neem or soapy water. Clear weeds around the field.' },
  { id: 'downy-mildew', emoji: '🌫️', name: 'Downy mildew', crops: ['onion', 'spinach'],
    symptoms: 'Pale yellow patches on leaves with a purplish mould in humid weather; leaves collapse.',
    treatment: 'Space plants for airflow; avoid overhead watering. Remove infected leaves. Copper spray if needed.' },
];

/* ---------------------------------------------------- Stage reminders */
// Keyed by crop stage (from season.ts cropStatus().stage.key).
export const STAGE_TIP_KEY: Record<string, string> = {
  initial: 'stageTips.initial',
  development: 'stageTips.development',
  mid: 'stageTips.mid',
  late: 'stageTips.late',
};

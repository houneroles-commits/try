/**
 * Market prices — INDICATIVE seed data so the assistant can answer "what's the
 * price of maize?" questions. Replace `PRICE_DATA` with a live feed later
 * (e.g. a market-price API or an official dataset) — the rest stays the same.
 */
export const PRICE_DATA = {
  updated: '2026-07-01',
  note: 'These are indicative wholesale prices — confirm at your local market before selling.',
  crops: {
    maize:  { unit: 'per 90kg bag', currency: 'KES', markets: { Nairobi: 4200, Nakuru: 3800, Eldoret: 3500, Mombasa: 4600, Kisumu: 3900 } },
    beans:  { unit: 'per 90kg bag', currency: 'KES', markets: { Nairobi: 9500, Nakuru: 8800, Eldoret: 8500, Mombasa: 10000 } },
    potato: { unit: 'per 50kg bag', currency: 'KES', markets: { Nairobi: 3200, Nakuru: 2800, Eldoret: 2600 } },
    tomato: { unit: 'per crate',    currency: 'KES', markets: { Nairobi: 4500, Nakuru: 4000, Mombasa: 5200 } },
    rice:   { unit: 'per 50kg bag', currency: 'KES', markets: { Nairobi: 6500, Mombasa: 6200, Kisumu: 6000 } },
  },
};

const CROP_ALIASES = {
  maize: 'maize', corn: 'maize', mahindi: 'maize',
  bean: 'beans', beans: 'beans', maharagwe: 'beans',
  potato: 'potato', potatoes: 'potato', irish: 'potato', viazi: 'potato',
  tomato: 'tomato', tomatoes: 'tomato', nyanya: 'tomato',
  rice: 'rice', mchele: 'rice',
};

export function isPriceQuery(text = '') {
  return /\b(price|prices|sell|selling|market|how much|cost|worth|bei|soko|nauza|uza)\b/i.test(text);
}

/** Best-effort crop detection from free text (falls back to null). */
export function detectCrop(text = '') {
  const t = text.toLowerCase();
  for (const alias of Object.keys(CROP_ALIASES)) {
    if (t.includes(alias)) return CROP_ALIASES[alias];
  }
  return null;
}

/** A context string to hand the LLM so it answers price questions with data. */
export function priceContext(crop) {
  const c = crop && PRICE_DATA.crops[crop];
  if (!c) {
    const list = Object.keys(PRICE_DATA.crops).join(', ');
    return `PRICE DATA: We only have indicative prices for these crops: ${list}. If the farmer asks about another crop, say you don't have its price yet.`;
  }
  const lines = Object.entries(c.markets)
    .map(([market, price]) => `${market}: ${c.currency} ${price} ${c.unit}`)
    .join('; ');
  return `PRICE DATA for ${crop} (updated ${PRICE_DATA.updated}): ${lines}. ${PRICE_DATA.note}`;
}

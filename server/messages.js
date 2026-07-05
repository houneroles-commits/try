/** Localized alert + SMS texts (en, zu, st, af). Keep under 160 chars. */

export const ALERT_TEXTS = {
  en: (mm) =>
    `Lima: Don't irrigate — about ${mm} mm of rain is expected at your farm in the next 2 days. Let the sky do the work.`,
  zu: (mm) =>
    `Lima: Unganiseli — kulindeleke imvula engaba ngu-${mm} mm epulazini lakho ezinsukwini ezi-2 ezizayo.`,
  st: (mm) =>
    `Lima: O se ke wa nosetsa — ho lebeletswe pula e ka bang ${mm} mm polasing ya hao matsatsing a 2 a tlang.`,
  af: (mm) =>
    `Lima: Moenie natlei nie — omtrent ${mm} mm reën word die volgende 2 dae by jou plaas verwag.`,
};

export const WEATHER_SMS = {
  en: (label, rows) => `Lima ${label}: ` + rows.map((r) => `${r.day} ${r.tMax}° rain ${r.mm}mm(${r.p}%)`).join(', '),
  zu: (label, rows) => `Lima ${label}: ` + rows.map((r) => `${r.day} ${r.tMax}° imvula ${r.mm}mm(${r.p}%)`).join(', '),
  st: (label, rows) => `Lima ${label}: ` + rows.map((r) => `${r.day} ${r.tMax}° pula ${r.mm}mm(${r.p}%)`).join(', '),
  af: (label, rows) => `Lima ${label}: ` + rows.map((r) => `${r.day} ${r.tMax}° reën ${r.mm}mm(${r.p}%)`).join(', '),
};

export const PUSH_TITLES = {
  en: 'Rain coming — skip irrigation',
  zu: 'Imvula iyeza — unganiseli',
  st: 'Pula e a tla — o se ke wa nosetsa',
  af: 'Reën oppad — moenie natlei nie',
};

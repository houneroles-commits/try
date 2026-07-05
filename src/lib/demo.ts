/**
 * DEMO MODE data — used whenever the network or API keys are unavailable.
 * Deterministic per calendar day so the app looks alive but stable.
 * Everything produced here is labeled `source: 'demo'` in the UI.
 */
import type {
  CurrentWeather,
  DailyForecast,
  HourlyPoint,
  WeatherBundle,
} from './types';

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function rng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Plausible summer pattern for the South African Highveld. */
export function demoWeather(lat = -26.2, lon = 28.04, label = 'Demo Farm'): WeatherBundle {
  const seed = rng('lima-' + isoDay(0));
  const daily: DailyForecast[] = [];
  for (let i = 0; i < 7; i++) {
    const r = seed();
    const stormy = r > 0.62; // scattered thunderstorms are the norm
    const tMax = Math.round(24 + seed() * 8);
    daily.push({
      date: isoDay(i),
      tMax,
      tMin: Math.round(tMax - 9 - seed() * 4),
      rainMm: stormy ? Math.round(4 + seed() * 18) : Math.round(seed() * 2),
      rainProb: stormy ? Math.round(55 + seed() * 40) : Math.round(seed() * 30),
      weatherCode: stormy ? (seed() > 0.5 ? 95 : 61) : seed() > 0.5 ? 2 : 0,
      windMax: Math.round(8 + seed() * 18),
      et0: Math.round((3.6 + seed() * 2.2) * 10) / 10,
    });
  }
  const hourly: HourlyPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 48; i++) {
    const t = new Date(now.getTime() + i * 3600_000);
    const h = t.getHours();
    const dayIdx = Math.min(6, Math.floor(i / 24));
    const d = daily[dayIdx];
    const diurnal = Math.sin(((h - 6) / 24) * Math.PI * 2) * 0.5 + 0.5;
    const afternoonStorm = h >= 14 && h <= 18 && d.rainProb > 50;
    hourly.push({
      time: t.toISOString(),
      temp: Math.round(d.tMin + (d.tMax - d.tMin) * diurnal),
      rainMm: afternoonStorm ? Math.round((d.rainMm / 4) * 10) / 10 : 0,
      rainProb: afternoonStorm ? d.rainProb : Math.round(d.rainProb * 0.3),
      soilMoisture: Math.round((0.18 + seed() * 0.1) * 100) / 100,
    });
  }
  const nowHour = new Date().getHours();
  const today = daily[0];
  const current: CurrentWeather = {
    temp: hourly[0].temp,
    feelsLike: hourly[0].temp + (today.tMax > 30 ? 2 : 0),
    humidity: Math.round(45 + seed() * 30),
    windSpeed: Math.round(today.windMax * 0.6),
    weatherCode: nowHour >= 14 && today.rainProb > 55 ? 61 : today.weatherCode === 95 ? 2 : today.weatherCode,
    isDay: nowHour >= 6 && nowHour < 18,
    time: new Date().toISOString(),
  };
  return {
    current,
    daily,
    hourly,
    fetchedAt: new Date().toISOString(),
    source: 'demo',
    locationLabel: label,
    lat,
    lon,
  };
}

/** Canned assistant replies for demo mode, keyed by rough topic. */
export function demoChatReply(userText: string, lang: string): string {
  const t = userText.toLowerCase();
  const table: Record<string, Record<string, string>> = {
    water: {
      en: 'Based on your forecast, water deeply every 3–4 days rather than a little every day — it pushes roots deeper and saves water. Water early in the morning to cut evaporation losses.',
      zu: 'Ngokwesimo sezulu sakho, nisela kakhulu njalo ezinsukwini ezi-3–4 kunokunisela kancane nsuku zonke — kwenza izimpande zijule futhi konga amanzi. Nisela ekuseni kakhulu.',
      st: 'Ho ya ka boemo ba leholimo ba hao, nosetsa haholo matsatsi a mang le a mang a 3–4 ho e-na le hanyane letsatsi le leng le le leng. Nosetsa hoseng haholo ho fokotsa mouwane.',
      af: 'Volgens jou voorspelling: gee eerder elke 3–4 dae ’n deeglike natlei as elke dag ’n bietjie — dit dwing wortels dieper en bespaar water. Besproei vroeg in die oggend.',
    },
    pest: {
      en: 'Check the undersides of leaves in the early morning. For aphids, a soap-water spray (1 tbsp soap per litre) works well. If you see chewed leaves, look for cutworms at the stem base at dusk.',
      zu: 'Hlola ngaphansi kwamaqabunga ekuseni. Ngezintwala zezitshalo, futha ngamanzi anensipho (ithisipuni eyodwa yensipho elitheni lamanzi). Uma ubona amaqabunga adliwe, funa izibungu ekuseni nasekuhlweni.',
      st: 'Hlahloba ka tlas’a makhasi hoseng. Bakeng sa dikokonyana, sebedisa metsi a sesepa (khaba e le ’ngoe ya sesepa ka lithara ya metsi). Ha o bona makhasi a jeloeng, batla diboko motsong wa kutu mantsiboya.',
      af: 'Kyk soggens vroeg onder die blare. Vir plantluise werk ’n seepwater-sproei (1 eetlepel seep per liter) goed. Gekoude blare? Soek snywurms teen skemer by die stambasis.',
    },
    plant: {
      en: 'For your area, plant after the first good rains when the soil is moist to at least a hand’s depth. Space maize rows about 75 cm apart and plant seeds 5 cm deep.',
      zu: 'Endaweni yakho, tshala emva kwemvula yokuqala enhle lapho inhlabathi imanzi okungenani ukujula kwesandla. Imigqa yommbila mayibe qhelelene ngo-75 cm, imbewu itshalwe ekujuleni kuka-5 cm.',
      st: 'Sebakeng sa hao, lema ka mor’a dipula tsa pele tse ntle ha mobu o le metsi bonyane botebo ba letsoho. Mela ya poone e be 75 cm, peo e lengoe botebo ba 5 cm.',
      af: 'Plant in jou omgewing ná die eerste goeie reëns wanneer die grond tot minstens ’n handdiepte klam is. Mielierye omtrent 75 cm uitmekaar, saad 5 cm diep.',
    },
    default: {
      en: 'Good question. As a rule of thumb: check your soil moisture with your finger before watering, watch the 7-day forecast on the Weather tab, and log what you do in Records so we can track your season together.',
      zu: 'Umbuzo omuhle. Umgomo olula: hlola umswakama wenhlabathi ngomunwe ngaphambi kokunisela, bheka isimo sezulu sezinsuku ezi-7 kuthebhu yeZulu, futhi ubhale okwenzayo kuMarekhodi.',
      st: 'Potso e ntle. Molao o bonolo: hlahloba mongobo wa mobu ka monwana pele o nosetsa, sheba boemo ba leholimo ba matsatsi a 7 tab-eng ya Leholimo, ’me o ngole tseo o di etsang ho Direkoto.',
      af: 'Goeie vraag. ’n Gulde reël: toets grondvog met jou vinger voor jy natgooi, hou die 7-dae-voorspelling op die Weer-oortjie dop, en teken aan wat jy doen onder Rekords.',
    },
  };
  let topic = 'default';
  if (/(water|irrig|nisela|nosetsa|besproei|natlei)/.test(t)) topic = 'water';
  else if (/(pest|bug|insect|disease|izintwala|kokonyana|plaag|luis)/.test(t)) topic = 'pest';
  else if (/(plant|seed|sow|tshala|lema|saai)/.test(t)) topic = 'plant';
  const langTable = table[topic];
  return langTable[lang] ?? langTable.en;
}

/** Canned photo-diagnosis reply for demo mode. */
export function demoDiagnosis(lang: string): string {
  const replies: Record<string, string> = {
    en: 'DEMO diagnosis: the leaf pattern resembles early blight (brown spots with rings). Remove affected leaves, avoid wetting foliage when watering, and consider a copper-based spray. If it spreads to stems, act quickly.',
    zu: 'Ukuhlola kwe-DEMO: iphethini yeqabunga lifana ne-early blight (amachashazi ansundu anezindilinga). Susa amaqabunga athintekile, ungawanethisi amaqabunga uma unisela, ucabange umuthi onekhopha.',
    st: 'Tlhahlobo ya DEMO: paterone ya lekhasi e tshwana le early blight (matheba a sootho a nang le mehele). Tlosa makhasi a amehileng, o se ke wa kolobisa makhasi ha o nosetsa, ’me o nahane ka moriana wa koporo.',
    af: 'DEMO-diagnose: die blaarpatroon lyk soos vroë roes (bruin kolle met ringe). Verwyder aangetaste blare, moenie die blare natmaak met besproeiing nie, en oorweeg ’n koperbespuiting.',
  };
  return replies[lang] ?? replies.en;
}

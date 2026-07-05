# 🌍 Lima — Farm Weather & Irrigation Assistant

*"Lima" means "to plough / cultivate" in isiZulu and Sesotho.*

A mobile-first, offline-capable PWA (plus SMS and voice-line services) that helps
smallholder farmers decide **when to water and when to plant**, using free
Open-Meteo forecasts and a Claude-powered agricultural assistant — with a warm,
earthy design built for cheap screens in bright sunlight.

**Everything runs with zero API keys** — the app, server and voice line all fall
back to clearly-labeled demo/simulation modes. Add keys later, feature by feature.

---

## Quick start (the app)

```bash
cd lima
npm install
npm run dev          # → http://localhost:5173
```

Production build + preview:

```bash
npm run build
npm run preview      # → http://localhost:4173  (PWA + offline works here)
```

That's it. Weather is live (Open-Meteo needs no key), the assistant answers with
labeled sample data, and the app installs to the home screen and works offline.

## Optional: the server (AI proxy + SMS/push rain alerts)

```bash
cd server
npm install
copy .env.example .env    # fill in what you have — everything is optional
npm start                 # → http://localhost:8790
```

Then point the app at it — in `lima/.env`:

```
VITE_API_BASE=http://localhost:8790
```

and rebuild/restart the app. With `ANTHROPIC_API_KEY` in `server/.env` the
assistant + photo-diagnosis go live; with `AT_USERNAME`/`AT_API_KEY` the
"don't irrigate — rain coming" SMS alerts send for real (otherwise they log
in simulation mode). Trigger a sweep manually: `POST /api/alerts/run`.

## Optional: the voice line (call in from any phone)

```bash
cd voice
npm install
copy .env.example .env
npm start                 # → http://localhost:8791
node simulate.js          # full conversation test — no phone needed
```

Live calls need an Africa's Talking voice number with its callback pointed at
`POST {PUBLIC_BASE_URL}/voice/incoming`, plus STT/TTS keys (see
`voice/.env.example` and the research notes in PROGRESS.md).

## Keys you may eventually want (all optional)

| Key | Where | Unlocks |
|---|---|---|
| `ANTHROPIC_API_KEY` | `server/.env`, `voice/.env` | Live AI answers + photo diagnosis + phone advisor |
| `AT_USERNAME`, `AT_API_KEY` | `server/.env` | Real SMS alerts (Africa's Talking) |
| `VAPID_PUBLIC/PRIVATE_KEY` | `server/.env` | Web-push notifications (`npx web-push generate-vapid-keys`) |
| `VULAVULA_API_KEY` | `voice/.env` | isiZulu/Sesotho/Afrikaans speech-to-text |
| `AZURE_SPEECH_KEY` | `voice/.env` | Natural isiZulu/Afrikaans voices on the phone line |

Full list with comments: `.env.example`, `server/.env.example`, `voice/.env.example`.

## What's inside

| Piece | Tech | Notes |
|---|---|---|
| App | React + Vite + TS, Tailwind, Framer Motion | Installable PWA, offline shell + last-known data |
| Weather | Open-Meteo (free, no key) | 7-day + hourly, ET₀, soil moisture; cached for offline |
| Map | Leaflet + OSM + RainViewer radar | Lazy-loaded, tiles cached |
| Charts | Recharts | Line/bar/area switchable, rainfall/temp/soil, CVD-safe palette |
| Irrigation advisor | Transparent water-balance rule | Documented in PROGRESS.md |
| Assistant | Claude (`claude-opus-4-8`) | Text, voice in/out (Web Speech), photo diagnosis |
| Languages | react-i18next | English, isiZulu, Sesotho, Afrikaans |
| Server | Node/Express | AI proxy, SMS + push alerts, JSON-file store |
| Voice line | Node/Express + Africa's Talking Voice | STT → Claude → TTS, simulation mode |

## Project map

```
lima/
├─ src/                  # the PWA
│  ├─ pages/             # Home, Assistant, Weather, Data, Settings, Irrigation,
│  │                     # Calendar, Records, Onboarding
│  ├─ components/        # UI kit, 3D hero, map, charts helpers
│  ├─ lib/               # weather, irrigation engine, season data, AI, speech
│  ├─ i18n/locales/      # en / zu / st / af
│  └─ sw.ts              # service worker (offline + web push)
├─ server/               # Express: AI proxy, SMS + push rain alerts
├─ voice/                # Express: inbound phone line (STT→Claude→TTS)
└─ PROGRESS.md           # build log, decisions, stubs, next steps
```

## The design language

Earthy and warm — soil browns, cream canvas, burnt-terracotta actions, a strong
red reserved strictly for warnings. All tokens live in one place
(`tailwind.config.js` + `src/theme.css`) and every text/background pair passes
WCAG AA for outdoor readability. The one 3D flourish (a low-poly clay landscape
on Home) is **off by default**, never pre-downloaded, pauses off-screen, and
refuses to run on 2G/data-saver connections.

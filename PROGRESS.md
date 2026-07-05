# PROGRESS — Lima build log

Status at hand-off: **all 8 phases built; app, server and voice line all run
and build cleanly with zero API keys (demo/simulation modes).**

Project folder: `C:\Users\IT\lima` (new folder created for this project).

---

## Phase log

### ✅ Phase 1 — Foundation & shell
- Vite + React 18 + TypeScript (strict), Tailwind 3, Framer Motion page transitions.
- Bottom nav (Home / Assist / Weather / Data / Settings), 48px+ tap targets,
  icon-led UI with a hand-drawn inline SVG icon set (no icon library = no extra bytes).
- Earthy palette defined ONCE in `tailwind.config.js` + `src/theme.css`
  (CSS variables, light + dark). Strong red only for `danger`.
  All shipped text/background pairs chosen for WCAG AA.
- PWA from the start: **custom service worker** (`src/sw.ts`, injectManifest) —
  precached shell, offline navigation fallback, runtime caches for Open-Meteo /
  OSM tiles / RainViewer, install prompt component, generated icons
  (`scripts/gen-icons.mjs` — zero-dependency PNG writer).
- ONE 3D scene (low-poly clay landscape + sun, react-three-fiber) on Home only:
  **off by default**, toggleable, lazy chunk **excluded from precache** (~800 KB
  saved for metered users), pauses off-screen/hidden tab, auto-disabled on
  2G/save-data, falls back to a gradient if the chunk can't load.
- Bundle discipline: main JS ≈ 448 KB (145 KB gz); three.js / recharts /
  leaflet / Anthropic SDK are all separate lazy chunks.

### ✅ Phase 2 — Languages
- react-i18next; switcher in Settings *and* first onboarding step.
- English, isiZulu (`zu`), Sesotho (`st`), Afrikaans (`af`) — every UI string is
  a key; nothing hardcoded.
- ⚠️ **zu / st / af strings are machine-translation-grade placeholders written
  by the AI assistant — get them professionally reviewed before field use.**
  Files: `src/i18n/locales/{zu,st,af}.json` and the SMS/voice strings in
  `server/messages.js` + `voice/index.js`.
- Sesotho month abbreviations in `st.json → calendar.monthsShort` are
  particularly unsure — flagged for the reviewer.

### ✅ Phase 3 — Weather + map
- Open-Meteo (free, no key): current, 48 h hourly (incl. 0–7 cm soil moisture),
  7-day daily incl. **ET₀** (drives the irrigation engine) — one request.
- GPS with graceful fallback → place search (Open-Meteo geocoder) → preset
  African cities list (works fully offline).
- Three-level data fallback everywhere: `live → cache (last-known) → demo`,
  always labeled with a source badge. Demo weather is deterministic per day.
- Leaflet + OSM map, lazy-loaded **behind a button** (never auto-downloads
  tiles), RainViewer precipitation radar overlay (free, no key).
  ⚠️ RainViewer radar coverage in Africa is patchy (decent over South Africa);
  the UI says so. Farm location drawn as a vector circle (no marker-image
  bundling issues).

### ✅ Phase 4 — Charts
- Recharts, lazy route chunk. Metrics: rainfall (logged + forecast),
  temperature (max/min), soil moisture (48 h). Chart type (line/bar/area) and
  range (7/14/30 d) switch on the fly; farmer records feed the rainfall chart.
- Series colors were run through the dataviz palette validator (CVD + contrast):
  light `#B3542F`/`#2B6CB0` on `#FFFCF5`, dark `#CE6C38`/`#3F87CA` on `#2A1C12` —
  all checks pass in both modes.

### ✅ Phase 5 — Irrigation decision tool (the core)
Transparent water-balance rule of thumb (`src/lib/irrigation.ts`):

```
TAW  (bucket)    = soil AWC (sand 70 / loam 140 / clay 170 mm per m) × root depth
RAW  (threshold) = TAW × 0.5                        (FAO-56 p ≈ 0.5)
ETc  (daily use) = ET₀ (Open-Meteo) × Kc            (crop & stage coefficient)
Deficit          = Σ days-since-watered ETc − 0.7 × farmer-logged rain
Rain48           = Σ next-48h forecast rain on days with ≥ 50% probability

Decision:  Rain48 covers ≥60% of deficit (and ≥5mm)  → SKIP — rain coming
           deficit ≥ RAW                              → IRRIGATE ≈ deficit − 0.7×Rain48
           otherwise                                  → WAIT, recheck in N days
```

**Assumptions (deliberately simple, documented for later refinement):**
- Kc values & stage lengths are FAO-56-style approximations per crop
  (`src/lib/season.ts`); without a planting date the mid-season Kc is used.
- Past-day ET is proxied by today's ET₀ (free Open-Meteo tier has no history API).
- Effective rainfall factor 0.7; deficit capped at TAW; result rounded to 5 mm.
- Litres = mm × 10 000 × ha. It's guidance, not gospel — the UI says to also
  check the soil by hand, and the "How this was worked out" panel shows every number.
- Prominent everywhere: the advice card is the first thing on Home, and the
  full planner (`/irrigation`) recalculates live as inputs change.

### ✅ Phase 5.5 — Profile, calendar, records
- 3-step onboarding (language → location → crops/soil/size), skippable,
  editable later from Settings. Stored locally; every feature reads it.
- Season calendar: planting-window month strip (Southern-Hemisphere defaults),
  growth-stage track once a planting date is set, expected-harvest date,
  forecast rain tie-in.
- Records: 2-tap logging (kind → preset amount) from Home and /records,
  history list, delete, CSV export. Irrigation logs auto-update "last watered"
  for the advisor; rain logs reduce the computed deficit.

### ✅ Phase 6 — AI assistant
- Chat calling Claude (`claude-opus-4-8` by default, model configurable via env).
  Three modes, auto-detected: server proxy (`VITE_API_BASE`, key stays
  server-side — recommended) → direct browser (`VITE_ANTHROPIC_API_KEY`,
  official SDK, dev only) → **demo mode** with topic-aware canned answers in
  all four languages, clearly badged.
- System prompt: expert African-farming advisor; short plain-language answers
  in the user's language; knows the farm profile + 3-day forecast. Structured
  in `buildSystemPrompt()` so document-retrieval context can be appended later
  (see "Next steps").
- Voice input via Web Speech API (`en-ZA`, `zu-ZA`, `st-ZA`, `af-ZA`) with
  live transcript; auto-sends on final result. TTS read-aloud per message +
  auto-speak setting. ⚠️ Browser STT quality: en/af good on Chrome-Android,
  zu partial, st poor (often falls back to English recognition).
- Photo diagnosis: camera button → client-side downscale/JPEG-compress
  (≤1024 px, ~100-200 KB upload) → Claude vision → likely disease/pest + actions.
- Chat history persists locally (last 40 messages).

### ✅ Phase 7 — Server (SMS + proactive alerts)
- `server/` Express app (port **8790** — 8787 was taken by another app on this
  machine). Endpoints: `/api/chat`, `/api/diagnose` (AI proxy),
  `/api/alerts/optin`, `/api/push/vapidPublicKey`, `/api/alerts/run` (manual
  sweep), `/api/sms/incoming` (Africa's Talking callback), `/api/health`.
- Alert job: every `ALERT_CHECK_HOURS` (6 h default) checks each opted-in
  user's own coordinates on Open-Meteo; if ≥ `ALERT_RAIN_MM` (10 mm) is
  expected within 48 h (≥50% probability days), sends localized
  **"Don't irrigate — rain coming"** via (a) web push and (b) Africa's Talking
  SMS. 20 h re-alert cooldown. Verified end-to-end in simulation.
- SMS layer (`server/sms.js`): real AT REST integration incl. sandbox, or
  **loud `[SMS SIMULATION]` logs** when keys are absent. Includes the seed of
  an SMS-only interface (START/STOP/WEATHER keywords) on `/api/sms/incoming`.
- Web push done properly: custom service worker handles `push` +
  `notificationclick`; client subscribes when a server + VAPID keys exist.
- Storage: JSON file (`server/data/users.json`) — swap for a DB at scale.

### ✅ Phase 8 — Voice phone line
- `voice/` — separate Express service (port 8791) so it scales independently.
- Call flow (Africa's Talking Voice XML, tested with curl):
  `POST /voice/incoming` → language IVR (1 English / 2 isiZulu / 3 Sesotho /
  4 Afrikaans) → localized "ask after the beep" prompt → `<Record>` →
  `POST /voice/turn`: **recording → STT → Claude (phone-tuned prompt, ≤3
  spoken sentences) → TTS → `<Play>`/`<Say>` → record next question** —
  a real back-and-forth conversation with per-call session history.
- Provider adapters (`voice/providers.js`) with clear TODOs where live
  credentials are needed; **full simulation mode** works today —
  `node voice/simulate.js` runs a 3-turn conversation with no phone.

#### STT/TTS research for zu / st / af (Phase 8 requirement)
- **Vulavula (Lelapa AI, South Africa)** — transcription available in English,
  Afrikaans, isiZulu and Sesotho, built for SA accents and code-switching.
  **Recommended primary STT** — the only provider covering all four target
  languages credibly. ([Lelapa AI](https://lelapa.ai/products/vulavula/),
  [MIT Tech Review](https://www.technologyreview.com/2023/11/17/1083637/lelapa-ai-african-languages-vulavula/),
  [ITWeb](https://www.itweb.co.za/article/sa-ai-start-up-in-push-to-meet-diverse-linguistic-needs/xA9PO7NED8Wvo4J8))
- **Azure Speech** — neural TTS voices exist for `af-ZA` (Adri/Willem) and
  `zu-ZA` (Thando/Themba), plus `en-ZA`. **Recommended TTS** for those
  languages. No Sesotho TTS.
  ([Microsoft language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support),
  [Azure TTS announcement](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/11-new-languages-and-variants-and-more-voices-are-added-to-azure%E2%80%99s-neural-text-t/3541770))
- **Google Cloud** — STT good for `af-ZA`/`zu-ZA`; Sesotho STT limited —
  verify current list before relying on it; TTS for `af-ZA` only among our
  targets. ([Google STT languages](https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages))
- ⚠️ **Weak-support warning: Sesotho TTS has no strong commercial option**
  as of this research. The scaffold falls back to Africa's Talking `<Say>`
  (English voice reading Sesotho text — audible but imperfect) and logs it.
  Alternatives to evaluate: Vulavula's TTS roadmap, or pre-recorded prompt
  audio for the fixed parts of the call.
- Africa's Talking's built-in `<Say>` is English-only — fine for the IVR menu,
  not for local-language answers; hence the external TTS adapters.

### ✅ Final — polish & docs
- Loading skeletons, empty states with actions, error bubbles in chat, offline
  banner, install prompt, toasts, micro-interactions (animated advice details,
  typing dots, sheet transitions, nav pills) on every screen.
- README, three .env.example files, this file.

---

## Anything you need to configure (summary)

1. **Nothing, to demo it** — `npm install && npm run dev`.
2. `server/.env` → `ANTHROPIC_API_KEY` for live AI; `AT_USERNAME`+`AT_API_KEY`
   for real SMS; VAPID keys for push. Then set `VITE_API_BASE` in `lima/.env`.
3. `voice/.env` → `PUBLIC_BASE_URL` (public HTTPS tunnel/host), AT voice number
   callback → `/voice/incoming`, `VULAVULA_API_KEY` (STT), `AZURE_SPEECH_KEY` (TTS).

## Known stubs / deliberate simplifications

| Item | Where | Why / what to do |
|---|---|---|
| Machine-translated zu/st/af strings | `src/i18n/locales/*`, `server/messages.js`, `voice/index.js` | Professional review needed |
| Vulavula/Google/Azure adapters unverified against live APIs | `voice/providers.js` (TODO comments) | Endpoints/shapes coded from docs; confirm once keys exist |
| Sesotho phone TTS | `voice/providers.js` | No good provider — `<Say>` fallback + log |
| Past-day ET proxied by today's ET₀ | `src/lib/irrigation.ts` | Open-Meteo free tier lacks history; consider their archive API |
| JSON-file subscriber store | `server/store.js` | Fine for pilot; swap for SQLite/Postgres at scale |
| Direct-browser Anthropic mode exposes the key | `src/lib/ai.ts` | Guarded by env + warning; use the proxy in production |
| AT Voice XML shapes | `voice/index.js` | Matches AT docs (GetDigits/Record/Say/Play); verify on a live number |
| Browser STT for zu/st | `src/lib/speech.ts` | Platform limitation; the phone line with Vulavula is the real answer |

## Recommended next steps

1. Professional translation review (highest impact, lowest effort).
2. Get an Anthropic key into `server/.env` and pilot the assistant.
3. Africa's Talking sandbox: verify SMS + a live test call against the scaffold.
4. RAG over your own agricultural documents: chunk PDFs → embed → prepend top-k
   snippets in `buildSystemPrompt()` (client) / `/api/chat` (server) — the
   prompt builder was structured for exactly this insertion point.
5. Field-test the irrigation numbers against local extension-service tables and
   tune Kc/AWC per region.
6. Swap the JSON store for SQLite; add rate limiting + an auth token to the
   server endpoints before public deployment.

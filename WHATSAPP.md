# WhatsApp AI Assistant — how it works

A two-way WhatsApp chatbot: a farmer messages on WhatsApp, the message reaches
this server, **Groq** (LLM) answers, and the reply goes back to WhatsApp. It runs
a short **intake** first (name → crop → location → problem) and remembers the
conversation per phone number.

```
Farmer (WhatsApp) → Twilio → /api/whatsapp/incoming → Groq → reply → Twilio → Farmer
```

## The main code (all under `server/`)

| File | Role |
|---|---|
| `whatsapp.js` | **Sender** — `sendWhatsApp(to, message)` via the Twilio API (simulation mode without keys) |
| `ai.js` | **AI** — `aiChat()` / `aiVision()` over Groq's OpenAI-compatible API |
| `index.js` | **Receiver** — `POST /api/whatsapp/incoming` (intake + reply), plus the welcome message on opt-in |
| `store.js` | **Memory** — per-phone chat history in `data/chats.json` |

### Key endpoints (in `index.js`)
- `POST /api/whatsapp/incoming` — Twilio calls this on every inbound WhatsApp message. Loads history, runs the intake system prompt through Groq, saves both sides, replies with TwiML. Farmer can text `reset` to start over.
- `POST /api/alerts/optin` — when a user opts in (from the web app Settings page), sends the welcome message that kicks off the intake.

### Change the intake questions
Edit the `WHATSAPP_SYSTEM` prompt in `server/index.js` (the numbered list), then
restart the server.

## Setup (for a fresh clone)

```bash
cd server
npm install
cp .env.example .env        # then paste the keys (see below)
node index.js               # → http://localhost:8790
```

Check it's alive: open http://localhost:8790/api/health →
`{"ai":"live","whatsapp":"live",...}`

### Keys you need in `server/.env`
- `GROQ_API_KEY` — free at https://console.groq.com/keys
- `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` — https://console.twilio.com

(The repo never contains real keys — they live only in your local `.env`,
which is git-ignored. Ask the project owner for the values.)

## Connecting Twilio to your local server (two-way chat)

Twilio can't reach `localhost`, so expose it with a tunnel:

```bash
ngrok http 8790            # gives https://xxxx.ngrok-free.app
```

Then in Twilio Console → **Messaging → Try it out → Send a WhatsApp message →
Sandbox settings**, set **"When a message comes in"** (HTTP **POST**) to:

```
https://xxxx.ngrok-free.app/api/whatsapp/incoming
```

To chat with the sandbox, first WhatsApp `join <code>` to **+1 415 523 8886**
(the code is shown on that Twilio page). Then message it a farming question.

> Note: the ngrok URL changes every restart — re-paste it into Twilio each time.
> For production, deploy the server and use an approved WhatsApp Business sender
> (set `TWILIO_WHATSAPP_FROM`).

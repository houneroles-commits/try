# Deploying Lima

Two parts: the **backend** (the WhatsApp/AI server, must run 24/7) and the
**frontend** (the PWA farmers open). Config files are included:
`render.yaml` (backend) and `netlify.toml` (frontend).

---

## 1. Backend → Render (free)

1. Push this repo to GitHub.
2. [render.com](https://render.com) → **New → Blueprint** → connect this repo.
   Render reads `render.yaml` and creates the `lima-server` web service.
3. When prompted, paste the secret env vars (from your local `server/.env`):
   - `GROQ_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `AT_API_KEY`
   - `OFFICER_WHATSAPP` (optional — leave blank if unused)
   *(The non-secret ones like `GROQ_MODEL` are already set in `render.yaml`.)*
4. Deploy. You'll get a URL like `https://lima-server.onrender.com`.
5. Verify: open `https://lima-server.onrender.com/api/health` →
   `{"ai":"live","whatsapp":"live",...}`

### Point Twilio at it
Twilio Console → Messaging → Try it out → Send a WhatsApp message →
**Sandbox settings** → "When a message comes in" (HTTP **POST**):
```
https://lima-server.onrender.com/api/whatsapp/incoming
```
No more ngrok needed.

---

## 2. Frontend → Netlify (free)

1. [netlify.com](https://netlify.com) → **Add new site → Import from GitHub** →
   pick this repo. Netlify reads `netlify.toml`.
2. **Site settings → Environment variables** → add:
   ```
   VITE_API_BASE = https://lima-server.onrender.com
   ```
   (Use YOUR backend URL from step 1.)
3. Deploy → you get `https://your-lima.netlify.app` — the link for farmers.

> Vercel/Cloudflare Pages work too: build `npm run build`, output dir `dist`,
> same `VITE_API_BASE` env var.

---

## Things to know before real use

- **Free backend sleeps** after ~15 min idle → the first WhatsApp message is
  slow or missed. Upgrade Render to a paid instance, or ping `/api/health`
  every ~10 min to keep it awake.
- **Data resets on redeploy.** The JSON store (`server/data/` — profiles, chat
  history, escalations) is on ephemeral disk. For production, add a Render
  persistent disk or move to a database.
- **WhatsApp sandbox** only messages numbers that sent `join <code>`. To reach
  any farmer, get an approved WhatsApp Business sender in Twilio and set
  `TWILIO_WHATSAPP_FROM` to it.
- **Market prices** in `server/prices.js` are indicative seed data — wire a real
  price source before relying on them.
- Never commit real keys. `server/.env` is git-ignored; set keys in the Render
  and Netlify dashboards instead.

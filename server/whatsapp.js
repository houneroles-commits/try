/**
 * WhatsApp layer — Twilio WhatsApp API (sandbox-friendly), ported from the
 * farmer-advisory project. Like sms.js, it degrades gracefully: without
 * TWILIO_* keys it logs in a clearly-labeled SIMULATION mode.
 *
 * Live mode needs in .env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM   (defaults to the Twilio sandbox number)
 *
 * Sandbox note: recipients must first opt in by sending "join <code>" on
 * WhatsApp to the sandbox number (Twilio Console → Messaging → Try it out).
 */

const FROM_DEFAULT = 'whatsapp:+14155238886'; // Twilio shared WhatsApp sandbox

export function whatsappMode() {
  return process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? 'live'
    : 'simulation';
}

/** Normalize to E.164-ish: keep a leading +, strip spaces/dashes/parens. */
export function normalizePhone(raw) {
  const s = String(raw || '').trim().replace(/^whatsapp:/i, '');
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/[^\d]/g, '');
}

/**
 * Download inbound WhatsApp media (photo/voice note) from Twilio. Twilio media
 * URLs need Basic auth; they 307-redirect to a pre-signed URL (fetch follows it
 * and drops the auth header cross-origin, which is exactly what we want).
 */
export async function fetchTwilioMedia(url) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const res = await fetch(url, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
  });
  if (!res.ok) throw new Error(`Twilio media ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || '';
  return { buf, contentType };
}

export async function sendWhatsApp(to, message) {
  const clean = normalizePhone(to);
  if (!clean) throw new Error('No destination phone number provided');

  if (whatsappMode() === 'simulation') {
    console.log(
      `[WHATSAPP SIMULATION] to=${clean}\n  "${message}"\n  (set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN in server/.env to send for real)`,
    );
    return { simulated: true };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || FROM_DEFAULT;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: `whatsapp:${clean}`, From: from, Body: message }),
    },
  );
  if (!res.ok) {
    let msg = await res.text();
    try {
      msg = JSON.parse(msg).message || msg;
    } catch {}
    throw new Error(`Twilio ${res.status}: ${msg}`);
  }
  const json = await res.json();
  console.log('[WHATSAPP SENT]', clean, json.sid ?? '');
  return json;
}

/**
 * SMS layer — Africa's Talking REST API with a clearly-logged SIMULATION
 * mode when credentials are absent. Nothing ever breaks without keys.
 *
 * Live mode needs in .env:
 *   AT_USERNAME  (use "sandbox" for the AT sandbox)
 *   AT_API_KEY
 *   AT_SENDER_ID (optional short code / alphanumeric)
 *
 * The same module is the seed of a future SMS-only interface for feature
 * phones: point your Africa's Talking incoming-SMS callback at
 * POST /api/sms/incoming and extend handleIncomingSms().
 */

const AT_URL = 'https://api.africastalking.com/version1/messaging';
const SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging';

export function smsMode() {
  return process.env.AT_USERNAME && process.env.AT_API_KEY ? 'live' : 'simulation';
}

export async function sendSMS(to, message) {
  if (smsMode() === 'simulation') {
    console.log(
      `[SMS SIMULATION] to=${to}\n  "${message}"\n  (set AT_USERNAME + AT_API_KEY in server/.env to send for real)`,
    );
    return { simulated: true };
  }
  const username = process.env.AT_USERNAME;
  const url = username === 'sandbox' ? SANDBOX_URL : AT_URL;
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set('from', process.env.AT_SENDER_ID);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apiKey: process.env.AT_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Africa's Talking ${res.status}: ${text}`);
  }
  const json = await res.json();
  console.log('[SMS SENT]', to, json?.SMSMessageData?.Message ?? '');
  return json;
}

/**
 * Seed of the SMS-only interface (feature phones text a shortcode).
 * Keep it keyword-based and terse — SMS costs money and has 160 chars.
 */
export function handleIncomingSms(from, text) {
  const q = (text || '').trim().toUpperCase();
  if (q.startsWith('STOP')) {
    return { reply: 'Lima: You will no longer receive alerts. Send START to rejoin.', action: 'optout' };
  }
  if (q.startsWith('START')) {
    return { reply: 'Lima: Welcome! You will receive rain alerts for your area. Send WEATHER for a forecast.', action: 'optin' };
  }
  if (q.startsWith('WEATHER') || q.startsWith('ZULU') || q.startsWith('PULA')) {
    return { reply: null, action: 'weather' }; // filled by caller with live forecast
  }
  return {
    reply: 'Lima: Send WEATHER for your forecast, START for rain alerts, STOP to leave.',
    action: 'help',
  };
}

/**
 * Proactive "don't irrigate — rain coming" alerts.
 *
 * Rule: if a subscriber's forecast shows >= RAIN_MM_THRESHOLD mm of rain
 * within the next 48 h (only counting days with >= 50% probability), and we
 * haven't alerted them in the last 20 h, send:
 *   (a) web push (if they granted notifications), and
 *   (b) SMS via Africa's Talking (simulated when no credentials).
 */
import webpush from 'web-push';
import { loadUsers, saveUsers } from './store.js';
import { sendSMS } from './sms.js';
import { sendWhatsApp, whatsappMode } from './whatsapp.js';
import { ALERT_TEXTS, PUSH_TITLES } from './messages.js';

const RAIN_MM_THRESHOLD = Number(process.env.ALERT_RAIN_MM ?? 10);
const REALERT_HOURS = 20;

let pushReady = false;
export function initPush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
      pub,
      priv,
    );
    pushReady = true;
    console.log('[push] VAPID keys loaded — web push enabled');
  } else {
    console.log(
      '[push] No VAPID keys — web push disabled. Generate with: npx web-push generate-vapid-keys',
    );
  }
  return pushReady;
}

export async function rain48h(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max&forecast_days=2&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('open-meteo ' + res.status);
  const json = await res.json();
  const sums = json.daily.precipitation_sum ?? [];
  const probs = json.daily.precipitation_probability_max ?? [];
  let mm = 0;
  for (let i = 0; i < sums.length; i++) {
    if ((probs[i] ?? 0) >= 50) mm += sums[i] ?? 0;
  }
  return Math.round(mm);
}

export async function runAlertSweep(verbose = false) {
  const users = await loadUsers();
  const optedIn = users.filter((u) => u.optIn && u.lat != null && u.lon != null);
  if (verbose) console.log(`[alerts] sweep: ${optedIn.length} opted-in subscriber(s)`);
  let sent = 0;

  for (const user of optedIn) {
    try {
      const lastAlert = user.lastAlertAt ? Date.parse(user.lastAlertAt) : 0;
      if (Date.now() - lastAlert < REALERT_HOURS * 3600_000) continue;

      const mm = await rain48h(user.lat, user.lon);
      if (verbose) console.log(`[alerts] ${user.phone || 'push-only'} → ${mm} mm expected/48h`);
      if (mm < RAIN_MM_THRESHOLD) continue;

      const lang = ALERT_TEXTS[user.language] ? user.language : 'en';
      const text = ALERT_TEXTS[lang](mm);

      if (user.phone) {
        // Prefer WhatsApp when Twilio is live; otherwise fall back to SMS.
        if (whatsappMode() === 'live') {
          await sendWhatsApp(user.phone, text).catch((e) =>
            console.error('[alerts] whatsapp failed:', e.message),
          );
        } else {
          await sendSMS(user.phone, text).catch((e) =>
            console.error('[alerts] sms failed:', e.message),
          );
        }
      }
      if (pushReady && user.subscription) {
        await webpush
          .sendNotification(
            user.subscription,
            JSON.stringify({ title: PUSH_TITLES[lang], body: text, url: '/' }),
          )
          .catch((e) => console.error('[alerts] push failed:', e.message));
      }
      user.lastAlertAt = new Date().toISOString();
      sent++;
    } catch (e) {
      console.error('[alerts] subscriber failed:', e.message);
    }
  }
  await saveUsers(users);
  if (verbose) console.log(`[alerts] done — ${sent} alert(s) sent`);
  return { checked: optedIn.length, sent };
}

export function startAlertScheduler() {
  const hours = Number(process.env.ALERT_CHECK_HOURS ?? 6);
  console.log(`[alerts] scheduler: every ${hours} h (threshold ${RAIN_MM_THRESHOLD} mm/48h)`);
  // first sweep shortly after boot, then on the interval
  setTimeout(() => void runAlertSweep(true), 15_000);
  setInterval(() => void runAlertSweep(true), hours * 3600_000);
}

/** Web-push subscription — only active when a Lima server (VITE_API_BASE) exists. */

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribePush(): Promise<PushSubscriptionJSON | null> {
  try {
    if (!API_BASE || !('serviceWorker' in navigator) || !('PushManager' in window))
      return null;
    if ((await Notification.requestPermission()) !== 'granted') return null;
    const reg = await navigator.serviceWorker.ready;
    const res = await fetch(`${API_BASE}/api/push/vapidPublicKey`);
    if (!res.ok) return null;
    const { key } = await res.json();
    if (!key) return null;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
    return sub.toJSON();
  } catch {
    return null;
  }
}

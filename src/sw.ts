/// <reference lib="webworker" />
/**
 * Custom service worker (injectManifest): app-shell precache, runtime
 * caching for weather/tiles, and Web Push for "rain coming" alerts.
 */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// Open-Meteo forecast — fresh when online, cached fallback offline
registerRoute(
  ({ url }) => url.hostname === 'api.open-meteo.com',
  new NetworkFirst({
    cacheName: 'open-meteo',
    networkTimeoutSeconds: 8,
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 86400 })],
  }),
);

registerRoute(
  ({ url }) => url.hostname === 'geocoding-api.open-meteo.com',
  new CacheFirst({
    cacheName: 'geocoding',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 * 30 })],
  }),
);

// OSM tiles — rarely change
registerRoute(
  ({ url }) => /(^|\.)tile\.openstreetmap\.org$/.test(url.hostname),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [new ExpirationPlugin({ maxEntries: 250, maxAgeSeconds: 86400 * 14 })],
  }),
);

// RainViewer radar — short-lived
registerRoute(
  ({ url }) => url.hostname.endsWith('rainviewer.com'),
  new NetworkFirst({
    cacheName: 'rainviewer',
    networkTimeoutSeconds: 6,
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 1800 })],
  }),
);

// The decorative 3D chunk is excluded from precache — cache on first use
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && /\/assets\/Hero3D-/.test(url.pathname),
  new CacheFirst({
    cacheName: 'hero3d',
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 86400 * 30 })],
  }),
);

/* ------------------------------------------------------------- Web Push */
self.addEventListener('push', (event: PushEvent) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? '' };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Lima', {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          void (client as WindowClient).navigate(url);
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

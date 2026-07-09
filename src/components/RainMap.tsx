/**
 * Leaflet map with an ANIMATED RainViewer precipitation-radar overlay.
 * Shows the last ~2h of radar plus RainViewer's short-term forecast frames,
 * so farmers can watch rain move toward their farm. Lazy-loaded (leaflet code
 * + CSS only download when the map opens).
 */
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';

interface Frame {
  path: string;
  time: number; // unix seconds
  forecast: boolean;
}

const FRAME_MS = 650; // playback speed

export default function RainMap({ lat, lon }: { lat: number; lon: number }) {
  const { t } = useTranslation();
  const [host, setHost] = useState<string>('https://tilecache.rainviewer.com');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const timer = useRef<number | null>(null);

  // Load available radar frames (past + forecast).
  useEffect(() => {
    let alive = true;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive || !json) return;
        if (typeof json.host === 'string') setHost(json.host);
        const past = (json?.radar?.past ?? []) as { time: number; path: string }[];
        const now = (json?.radar?.nowcast ?? []) as { time: number; path: string }[];
        const all: Frame[] = [
          ...past.map((f) => ({ ...f, forecast: false })),
          ...now.map((f) => ({ ...f, forecast: true })),
        ];
        setFrames(all);
        setI(Math.max(0, past.length - 1)); // start at "now"
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Animate.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    timer.current = window.setInterval(
      () => setI((prev) => (prev + 1) % frames.length),
      FRAME_MS,
    );
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, frames.length]);

  const frame = frames[i];
  const label = frame
    ? `${frame.forecast ? '⏩ ' : ''}${new Date(frame.time * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}${frame.forecast ? ` · ${t('weather.forecastLabel')}` : ''}`
    : '';

  return (
    <div className="relative">
      <MapContainer
        center={[lat, lon]}
        zoom={8}
        style={{ height: 320, width: '100%' }}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {frame && (
          <TileLayer
            key={frame.path}
            attribution='<a href="https://www.rainviewer.com/">RainViewer</a>'
            url={`${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`}
            opacity={0.65}
          />
        )}
        <CircleMarker
          center={[lat, lon]}
          radius={9}
          pathOptions={{ color: '#B3542F', fillColor: '#B3542F', fillOpacity: 0.85, weight: 3 }}
        />
      </MapContainer>

      {/* radar playback controls */}
      {frames.length > 1 && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] flex items-center gap-3 rounded-xl bg-surface/90 backdrop-blur px-3 py-2 shadow-card">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="tap shrink-0 w-9 h-9 rounded-full bg-clay text-on-clay flex items-center justify-center font-bold"
            aria-label={playing ? t('common.cancel') : t('weather.playRadar')}
          >
            {playing ? '❚❚' : '►'}
          </button>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={i}
            onChange={(e) => {
              setPlaying(false);
              setI(Number(e.target.value));
            }}
            className="flex-1 accent-clay"
            aria-label={t('weather.radarTime')}
          />
          <span
            className={`shrink-0 text-xs font-bold tabular-nums ${
              frame?.forecast ? 'text-clay-strong' : 'text-ink-soft'
            }`}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

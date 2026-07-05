/**
 * Leaflet map with an optional RainViewer precipitation-radar overlay.
 * Lazy-loaded: leaflet code + CSS only download when the map is opened.
 */
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';

export default function RainMap({
  lat,
  lon,
}: {
  lat: number;
  lon: number;
}) {
  const [radarPath, setRadarPath] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive || !json) return;
        const frames = json?.radar?.past;
        if (Array.isArray(frames) && frames.length > 0) {
          setRadarPath(frames[frames.length - 1].path as string);
        }
      })
      .catch(() => {
        /* radar simply not shown */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
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
      {radarPath && (
        <TileLayer
          attribution='<a href="https://www.rainviewer.com/">RainViewer</a>'
          url={`https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/2/1_1.png`}
          opacity={0.65}
        />
      )}
      <CircleMarker
        center={[lat, lon]}
        radius={9}
        pathOptions={{
          color: '#B3542F',
          fillColor: '#B3542F',
          fillOpacity: 0.85,
          weight: 3,
        }}
      />
    </MapContainer>
  );
}

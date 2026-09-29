import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Heart } from 'lucide-react';

interface MapMarker {
  id: string;
  position: [number, number];
  type: 'donor' | 'request' | 'camp' | 'bloodbank';
  title: string;
  info?: string;
  onClick?: () => void;
}

interface MapViewProps {
  center?: [number, number];
  markers?: MapMarker[];
  zoom?: number;
  height?: string;
}

const iconColors = {
  donor: '#10b981',
  request: '#ef4444',
  camp: '#f59e0b',
  bloodbank: '#3b82f6'
};

export function MapView({
  center = [20.5937, 78.9629],
  markers = [],
  zoom = 5,
  height = '400px'
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    markers.forEach((marker) => {
      const color = iconColors[marker.type];

      const customIcon = L.divIcon({
        html: `
          <div style="
            background: ${color};
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg
              style="transform: rotate(45deg); width: 18px; height: 18px;"
              fill="white"
              viewBox="0 0 24 24"
              stroke="white"
              stroke-width="2"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        `,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      const leafletMarker = L.marker(marker.position, { icon: customIcon })
        .addTo(map);

      if (marker.title || marker.info) {
        leafletMarker.bindPopup(`
          <div class="text-sm">
            <strong class="block text-base mb-1">${marker.title}</strong>
            ${marker.info ? `<p class="text-gray-600">${marker.info}</p>` : ''}
          </div>
        `);
      }

      if (marker.onClick) {
        leafletMarker.on('click', marker.onClick);
      }
    });

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => m.position));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, zoom);
    }
  }, [markers, center, zoom]);

  return <div ref={mapRef} style={{ height, width: '100%' }} className="rounded-lg shadow-md" />;
}

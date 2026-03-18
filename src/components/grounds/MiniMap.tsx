import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MiniMapProps {
  latitude: number;
  longitude: number;
  className?: string;
}

export default function MiniMap({ latitude, longitude, className }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [longitude, latitude],
      zoom: 9,
      interactive: false,
      attributionControl: false,
    });

    new maplibregl.Marker({ color: '#e74c3c' })
      .setLngLat([longitude, latitude])
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  return <div ref={containerRef} className={className} />;
}

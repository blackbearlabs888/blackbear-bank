'use client';

import { useEffect, useRef, useState, RefObject } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface MapProviderProps {
  mapContainerRef: RefObject<HTMLDivElement | null>;
  locations: Location[];
  onMarkerClick?: (location: Location) => void;
  onMarkerHover?: (locationId: string | null) => void;
}

export default function MapProvider({
  mapContainerRef,
  locations,
  onMarkerClick,
  onMarkerHover,
}: MapProviderProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create map with dark style using CartoDB Dark Matter
    const mapInstance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'dark-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© CARTO © OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'dark-tiles',
            type: 'raster',
            source: 'dark-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [118, -2.5], // Center of Indonesia
      zoom: 4.5,
      attributionControl: false,
    });

    mapRef.current = mapInstance;

    mapInstance.on('load', () => {
      setLoaded(true);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      mapInstance.remove();
      mapRef.current = null;
    };
  }, [mapContainerRef]);

  // Add markers when map is loaded and locations change
  useEffect(() => {
    if (!mapRef.current || !loaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each location
    locations.forEach((location) => {
      if (!location.latitude || !location.longitude) return;

      // Create precise dot marker
      const el = document.createElement('div');
      el.className = 'location-marker';
      el.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        cursor: pointer;
        position: relative;
        background: #f97316;
        box-shadow: 0 0 8px #f97316, 0 0 16px rgba(249, 115, 22, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.9);
        transition: all 0.2s ease;
        z-index: 1;
      `;

      // Outer glow ring
      const glowRing = document.createElement('div');
      glowRing.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, transparent 70%);
        pointer-events: none;
      `;
      el.appendChild(glowRing);

      // Hover effects
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.4)';
        el.style.boxShadow = '0 0 12px #f97316, 0 0 24px rgba(249, 115, 22, 0.6)';
        el.style.zIndex = '10';
        onMarkerHover?.(location.id);
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 0 8px #f97316, 0 0 16px rgba(249, 115, 22, 0.4)';
        el.style.zIndex = '1';
        onMarkerHover?.(null);
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onMarkerClick?.(location);
      });

      // Create marker with precise positioning
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'center',
        offset: [0, 0]
      })
        .setLngLat([location.longitude, location.latitude])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds if there are locations
    if (locations.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      locations.forEach(loc => {
        if (loc.latitude && loc.longitude) {
          bounds.extend([loc.longitude, loc.latitude]);
        }
      });
      
      if (bounds.isEmpty() === false) {
        mapRef.current!.fitBounds(bounds, {
          padding: 60,
          maxZoom: 8,
          duration: 1000,
        });
      }
    }
  }, [loaded, locations, onMarkerClick, onMarkerHover]);

  if (!loaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e] z-[100]">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-zinc-400 text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  return null;
}

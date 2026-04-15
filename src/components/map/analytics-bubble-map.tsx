'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader } from 'lucide-react';
import { INDONESIAN_CITIES } from '@/lib/indonesia-cities';

interface CityData {
  city: string;
  count: number;
  volume: number;
}

interface AnalyticsBubbleMapProps {
  topCities: CityData[];
  accentColor?: string;
}

export default function AnalyticsBubbleMap({ topCities, accentColor = '#8b5cf6' }: AnalyticsBubbleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupsRef = useRef<maplibregl.Popup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(4.5);

  // Resolve cities with coordinates
  // Fuzzy city lookup - tries exact, then prefix, then best contains match
  const resolveCityCoords = (cityName: string) => {
    const key = cityName.toLowerCase().trim();
    // 1. Exact match
    if (INDONESIAN_CITIES[key]) return INDONESIAN_CITIES[key];
    // 2. Try removing common prefixes like "kota ", "kabupaten ", "kecamatan "
    const stripped = key.replace(/^(kota|kabupaten|kecamatan|kab|kec)\.?\s+/, '');
    if (INDONESIAN_CITIES[stripped]) return INDONESIAN_CITIES[stripped];
    // 3. Try contains match - find the BEST (longest) matching key for precision
    const keys = Object.keys(INDONESIAN_CITIES);
    let bestMatch: string | null = null;
    let bestScore = 0;
    for (const k of keys) {
      // Score by match length (longer = more precise)
      if (key.includes(k) && k.length > bestScore) {
        bestScore = k.length;
        bestMatch = k;
      }
      if (stripped.includes(k) && k.length > bestScore) {
        bestScore = k.length;
        bestMatch = k;
      }
    }
    if (bestMatch) return INDONESIAN_CITIES[bestMatch];
    // 4. Reverse: check if any key contains the stripped name (e.g., "solo" → "solo kota")
    let reverseBest: string | null = null;
    let reverseScore = Infinity;
    for (const k of keys) {
      if (k.includes(stripped) && k.length < reverseScore && k.length <= stripped.length + 8) {
        reverseScore = k.length;
        reverseBest = k;
      }
    }
    if (reverseBest) return INDONESIAN_CITIES[reverseBest];
    return null;
  };

  // Memoize resolved cities to prevent infinite re-render loop
  const resolvedCities = useMemo(() =>
    topCities
      .map(city => {
        const coords = resolveCityCoords(city.city);
        if (!coords) return null;
        return { ...city, lat: coords.lat, lng: coords.lng };
      })
      .filter(Boolean) as (CityData & { lat: number; lng: number })[],
    [topCities]
  );

  const maxCount = resolvedCities.length > 0 ? resolvedCities[0].count : 1;

  // Color palette for bubbles
  const bubbleColors = [
    accentColor,
    '#06b6d4',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#6366f1',
    '#14b8a6',
  ];

  // Update bubble sizes based on zoom level
  const updateMarkerSizes = useCallback((currentZoom: number) => {
    markersRef.current.forEach((marker, index) => {
      if (index >= resolvedCities.length) return;
      const el = marker.getElement();
      if (!el) return;

      const city = resolvedCities[index];
      const color = bubbleColors[index % bubbleColors.length];
      const ratio = city.count / maxCount;

      // Zoom-dependent sizing
      let size: number;
      if (currentZoom < 4) {
        // Zoomed way out → tiny dot
        size = 6 + ratio * 4; // 6-10px
      } else if (currentZoom < 5.5) {
        // Default view → medium bubble
        size = 10 + ratio * 18; // 10-28px
      } else {
        // Zoomed in → big bubble
        size = 20 + ratio * 28; // 20-48px
      }

      const glowRing = el.querySelector('.bubble-glow') as HTMLElement | null;

      // Adjust glow ring size
      if (glowRing) {
        const glowSize = size * 1.8;
        glowRing.style.width = `${glowSize}px`;
        glowRing.style.height = `${glowSize}px`;
        glowRing.style.opacity = currentZoom < 4.5 ? '0' : '1';
      }

      // Adjust border
      const borderW = currentZoom < 4 ? 1 : 2;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderWidth = `${borderW}px`;
      el.style.boxShadow = currentZoom < 4
        ? `0 0 ${size * 0.3}px ${color}55`
        : `0 0 ${size * 0.4}px ${color}66, 0 0 ${size * 0.8}px ${color}33`;
    });
  }, [resolvedCities, maxCount, bubbleColors]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Ensure container has dimensions before initializing
    const container = mapContainerRef.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      // Wait for layout
      const ro = new ResizeObserver(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          ro.disconnect();
          mapRef.current?.resize();
        }
      });
      ro.observe(container);
    }

    const mapInstance = new maplibregl.Map({
      container,
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
      center: [118, -2.5],
      zoom: 4.5,
      attributionControl: false,
      fadeDuration: 0,
      crossSourceCollisions: false,
    });

    mapRef.current = mapInstance;

    // Track zoom changes
    mapInstance.on('zoom', () => {
      const z = mapInstance.getZoom();
      setZoom(z);
      updateMarkerSizes(z);
    });

    mapInstance.on('load', () => {
      // Force a resize after load to prevent rendering hang
      requestAnimationFrame(() => {
        mapInstance.resize();
      });
      setLoaded(true);
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      popupsRef.current.forEach(popup => popup.remove());
      popupsRef.current = [];
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      mapInstance.remove();
      mapRef.current = null;
    };
  }, [mapContainerRef]);

  // Add bubble markers
  useEffect(() => {
    if (!mapRef.current || !loaded || resolvedCities.length === 0) return;

    // Clear existing
    popupsRef.current.forEach(popup => popup.remove());
    popupsRef.current = [];
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const currentZoom = mapRef.current.getZoom();

    resolvedCities.forEach((city, index) => {
      const color = bubbleColors[index % bubbleColors.length];
      const ratio = city.count / maxCount;

      // Initial size based on current zoom
      let size: number;
      if (currentZoom < 4) {
        size = 6 + ratio * 4;
      } else if (currentZoom < 5.5) {
        size = 10 + ratio * 18;
      } else {
        size = 20 + ratio * 28;
      }

      // Create bubble element
      const el = document.createElement('div');
      el.className = 'analytics-bubble-marker';
      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        cursor: pointer;
        position: relative;
        background: radial-gradient(circle at 35% 35%, ${color}cc, ${color}88);
        box-shadow: 0 0 ${size * 0.4}px ${color}66, 0 0 ${size * 0.8}px ${color}33;
        border: ${currentZoom < 4 ? 1 : 2}px solid rgba(255, 255, 255, 0.8);
        transition: width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease, transform 0.2s ease;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      `;



      // Outer glow ring
      const glowRing = document.createElement('div');
      glowRing.className = 'bubble-glow';
      glowRing.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${size * 1.8}px;
        height: ${size * 1.8}px;
        border-radius: 50%;
        background: radial-gradient(circle, ${color}22 0%, transparent 70%);
        pointer-events: none;
        animation: bubble-pulse 2.5s ease-in-out infinite;
        opacity: ${currentZoom < 4.5 ? 0 : 1};
        transition: opacity 0.3s ease;
      `;
      el.appendChild(glowRing);

      // Hover effects
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
        el.style.boxShadow = `0 0 ${size * 0.6}px ${color}88, 0 0 ${size * 1.2}px ${color}44`;
        el.style.zIndex = '10';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = `0 0 ${size * 0.4}px ${color}66, 0 0 ${size * 0.8}px ${color}33`;
        el.style.zIndex = '1';
      });

      // Create popup
      const popup = new maplibregl.Popup({
        offset: size / 2 + 4,
        closeButton: false,
        className: 'analytics-map-popup',
        maxWidth: '200px',
      }).setHTML(`
        <div style="padding: 8px 10px; text-align: center;">
          <div style="font-size: 13px; font-weight: 700; color: #f4f4f5; margin-bottom: 2px;">${city.city}</div>
          <div style="font-size: 11px; color: #a1a1aa;">${city.count} ${city.count > 1 ? 'items' : 'item'}</div>
          ${city.volume > 0 ? `<div style="font-size: 10px; color: ${color}; margin-top: 2px; font-weight: 600;">Rp ${new Intl.NumberFormat('id-ID').format(city.volume)}</div>` : ''}
        </div>
      `);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        offset: [0, 0],
      })
        .setLngLat([city.lng, city.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    // Fit bounds — tighter zoom for precision
    // Use setTimeout + resize to prevent initial load hang
    if (resolvedCities.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      resolvedCities.forEach(city => {
        bounds.extend([city.lng, city.lat]);
      });

      if (!bounds.isEmpty()) {
        const padding = resolvedCities.length === 1 ? 80 : 40;
        // Delay fitBounds to after render to prevent hang
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.resize();
            mapRef.current.fitBounds(bounds, {
              padding,
              maxZoom: resolvedCities.length === 1 ? 10 : 8,
              duration: 0,
              essential: true,
            });
          }
        }, 100);
      }
    }
  }, [loaded, resolvedCities, maxCount, bubbleColors]);

  return (
    <>
      {/* Inject popup & animation styles */}
      <style>{`
        .analytics-map-popup .maplibregl-popup-content {
          background: rgba(24, 24, 40, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          overflow: hidden;
        }
        .analytics-map-popup .maplibregl-popup-tip {
          border-top-color: rgba(24, 24, 40, 0.95);
          border-left-color: transparent;
          border-right-color: transparent;
          border-bottom-color: transparent;
        }
        .analytics-map-popup .maplibregl-popup-close-button {
          display: none;
        }
        @keyframes bubble-pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
        .analytics-bubble-marker {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>

      <div className="relative w-full rounded-xl overflow-hidden border border-border/40 sm:aspect-[1.8] aspect-[1.5] sm:min-h-[220px] min-h-[180px]">
        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="absolute inset-0 h-full w-full"
        />

        {/* Loading State */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-sm z-[100]">
            <div className="flex flex-col items-center gap-2">
              <Loader className="w-5 h-5 text-muted-foreground animate-spin" />
              <span className="text-[10px] text-muted-foreground">Loading map...</span>
            </div>
          </div>
        )}

        {/* Legend */}
        {loaded && resolvedCities.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 z-10">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}88` }}
              />
              <span className="text-[9px] text-zinc-300 font-medium">{resolvedCities.length} Lokasi</span>
            </div>
          </div>
        )}

        {/* Attribution */}
        {loaded && (
          <div className="absolute bottom-2.5 right-2.5 text-[8px] text-zinc-600 z-10">
            © CARTO © OSM
          </div>
        )}

        {/* Empty State */}
        {loaded && resolvedCities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Belum ada data lokasi</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

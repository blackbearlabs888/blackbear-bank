'use client';

import { createContext, useContext } from 'react';
import type { Map } from 'maplibre-gl';

interface MapContextType {
  map: Map | null;
}

export const MapContext = createContext<MapContextType>({ map: null });

export function useMap() {
  return useContext(MapContext);
}

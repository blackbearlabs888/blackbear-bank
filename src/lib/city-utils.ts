// Server-only city utilities
// This file should only be imported in API routes / server components

import { INDONESIAN_CITIES, CityData } from './indonesia-cities';

/**
 * Get city data (coordinates, province, island) by city name
 * Supports fuzzy matching - case insensitive, handles extra spaces
 */
export function getCityData(cityName: string): CityData | null {
  if (!cityName) return null;
  
  // Normalize: lowercase and trim
  const normalized = cityName.toLowerCase().trim();
  
  // Direct lookup
  if (INDONESIAN_CITIES[normalized]) {
    return INDONESIAN_CITIES[normalized];
  }
  
  // Fuzzy search: find closest match
  const cityKeys = Object.keys(INDONESIAN_CITIES);
  
  // Try to find a city that contains the search term or vice versa
  for (const key of cityKeys) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return INDONESIAN_CITIES[key];
    }
  }
  
  // Try removing common suffixes like "kota", "kabupaten"
  const cleanName = normalized
    .replace(/kota$/i, '')
    .replace(/kabupaten$/i, '')
    .replace(/kab$/i, '')
    .trim();
    
  if (INDONESIAN_CITIES[cleanName]) {
    return INDONESIAN_CITIES[cleanName];
  }
  
  return null;
}

/**
 * Get coordinates for a city
 * Returns [lat, lng] array or null
 */
export function getCityCoordinates(cityName: string): [number, number] | null {
  const data = getCityData(cityName);
  if (!data) return null;
  return [data.lat, data.lng];
}

/**
 * Get province for a city
 */
export function getCityProvince(cityName: string): string | null {
  const data = getCityData(cityName);
  return data?.province || null;
}

/**
 * Get island for a city
 */
export function getCityIsland(cityName: string): string | null {
  const data = getCityData(cityName);
  return data?.island || null;
}

/**
 * Check if a city exists in the database
 */
export function cityExists(cityName: string): boolean {
  return getCityData(cityName) !== null;
}

/**
 * Get all cities in a specific province
 */
export function getCitiesByProvince(provinceName: string): string[] {
  const normalized = provinceName.toLowerCase().trim();
  return Object.entries(INDONESIAN_CITIES)
    .filter(([_, data]) => data.province?.toLowerCase().includes(normalized))
    .map(([name]) => name);
}

/**
 * Get all cities on a specific island
 */
export function getCitiesByIsland(islandName: string): string[] {
  const normalized = islandName.toLowerCase().trim();
  return Object.entries(INDONESIAN_CITIES)
    .filter(([_, data]) => data.island?.toLowerCase().includes(normalized))
    .map(([name]) => name);
}

/**
 * Search cities by name (fuzzy search)
 */
export function searchCities(query: string, limit: number = 10): Array<{ name: string; data: CityData }> {
  if (!query) return [];
  
  const normalized = query.toLowerCase().trim();
  const results: Array<{ name: string; data: CityData }> = [];
  
  for (const [name, data] of Object.entries(INDONESIAN_CITIES)) {
    if (name.includes(normalized)) {
      results.push({ name, data });
      if (results.length >= limit) break;
    }
  }
  
  return results;
}

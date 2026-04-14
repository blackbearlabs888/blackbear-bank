// Server-only city utilities
// This file should only be imported in API routes / server components

import { INDONESIAN_CITIES, CityData } from './indonesia-cities';

// Re-export types
export type { CityData } from './indonesia-cities';

// Generate SEO content for a city
export function generateLocationContent(city: string, province?: string): {
  description: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  content: string;
} {
  const cityLower = city.toLowerCase();
  const provinceText = province ? ` ${province}` : '';
  
  return {
    description: `Layanan gestun dan tarik tunai terpercaya di ${city}${provinceText}. Proses cepat, aman, dan transparan dengan fee kompetitif. Tersedia untuk semua jenis kartu kredit dan paylater.`,
    
    metaTitle: `Gestun ${city} - Layanan Tarik Tunai Terpercaya | Black Bear`,
    
    metaDescription: `Jasa gestun ${cityLower} terpercaya dengan proses cepat dan aman. Tarik tunai kartu kredit dan paylater dengan fee terbaik. Hubungi kami sekarang untuk layanan profesional.`,
    
    keywords: `gestun ${cityLower}, tarik tunai ${cityLower}, jasa gestun ${cityLower}, gestun kartu kredit ${cityLower}, gestun paylater ${cityLower}, tarik tunai kartu kredit ${cityLower}, gestun terpercaya ${cityLower}, jasa tarik tunai ${cityLower}`,
    
    content: `## Layanan Gestun ${city} - Black Bear

Black Bear menyediakan layanan gestun dan tarik tunai terpercaya di ${city}${provinceText}. Kami melayani berbagai jenis transaksi dengan proses cepat, aman, dan transparan.

### Layanan Kami di ${city}

**1. Gestun Kartu Kredit**
- Semua jenis kartu kredit (Visa, Mastercard, JCB, dll)
- Proses cepat dalam hitungan menit
- Fee kompetitif dan transparan

**2. Gestun Paylater**
- GoPay Later
- Shopee Paylater
- Akulaku
- Kredivo
- Dan lainnya

**3. Tarik Tunai**
- Proses instan
- Tanpa ribet
- Aman dan terpercaya

### Mengapa Memilih Black Bear ${city}?

✅ **Aman & Terpercaya** - Ribuan pelanggan puas dengan layanan kami
✅ **Proses Cepat** - Transaksi selesai dalam hitungan menit
✅ **Fee Transparan** - Tidak ada biaya tersembunyi
✅ **Layanan 24 Jam** - Kami siap melayani kapan saja

### Hubungi Kami

Tertarik dengan layanan gestun di ${city}? Hubungi kami sekarang melalui WhatsApp untuk konsultasi gratis dan informasi lebih lanjut.

**Black Bear ${city}** - Partner terpercaya untuk kebutuhan gestun dan tarik tunai Anda.
`,
  };
}

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

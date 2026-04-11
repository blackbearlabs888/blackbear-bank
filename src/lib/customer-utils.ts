// Customer Utility Functions
// Helper functions for customer duplicate detection and phone normalization

import { db } from '@/lib/db';

/**
 * Normalize phone number to consistent format (62xxx)
 * Removes spaces, dashes, parentheses and converts to 62 format
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Convert to 62 format
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    // If doesn't start with 62 or 0, assume it's a local number
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}

/**
 * Generate all possible phone number variations
 * Returns array of possible formats for matching
 */
export function getPhoneVariations(phone: string): string[] {
  if (!phone) return [];
  
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  const variations = new Set<string>();
  
  // Add original cleaned number
  variations.add(cleaned);
  
  // If starts with 0, create 62 version
  if (cleaned.startsWith('0')) {
    variations.add('62' + cleaned.substring(1));
  }
  
  // If starts with 62, create 0 version
  if (cleaned.startsWith('62')) {
    variations.add('0' + cleaned.substring(2));
  }
  
  // If starts with +62, create both versions
  if (cleaned.startsWith('+62')) {
    const withoutPlus = cleaned.substring(1);
    variations.add(withoutPlus);
    variations.add('0' + withoutPlus.substring(2));
  }
  
  // If doesn't start with 0 or 62, add both prefixes
  if (!cleaned.startsWith('0') && !cleaned.startsWith('62')) {
    variations.add('0' + cleaned);
    variations.add('62' + cleaned);
  }
  
  return Array.from(variations);
}

/**
 * Interface for duplicate check result
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'phone' | 'name' | 'both' | null;
  existingCustomer: {
    id: string;
    name: string;
    phone: string;
    city?: string | null;
    label: string;
    totalTransactions: number;
    totalVolume: number;
    addedBy: string;
    partnerId?: string | null;
  } | null;
  message: string;
}

/**
 * Find existing customer by phone or name
 * Returns the customer if found, null otherwise
 */
export async function findExistingCustomer(
  phone: string,
  name?: string,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  if (!phone && !name) {
    return {
      isDuplicate: false,
      duplicateType: null,
      existingCustomer: null,
      message: 'No search criteria provided',
    };
  }
  
  // Get all phone variations
  const phoneVariations = phone ? getPhoneVariations(phone) : [];
  
  // Build OR conditions for search
  const orConditions: Array<{ [key: string]: unknown }> = [];
  
  // Search by phone variations
  if (phoneVariations.length > 0) {
    orConditions.push(
      ...phoneVariations.map(p => ({ phone: p })),
      ...phoneVariations.map(p => ({ phone: { contains: p.replace(/^62/, '0') } })),
      ...phoneVariations.map(p => ({ phone: { contains: p.replace(/^0/, '62') } }))
    );
  }
  
  // Search by name (exact match, case insensitive)
  if (name) {
    orConditions.push({
      name: { equals: name, mode: 'insensitive' as const }
    });
  }
  
  // Build where clause
  const whereClause: { [key: string]: unknown } = {
    OR: orConditions
  };
  
  // Exclude specific ID if provided
  if (excludeId) {
    whereClause.NOT = { id: excludeId };
  }
  
  try {
    const existingCustomer = await db.customer.findFirst({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        label: true,
        totalTransactions: true,
        totalVolume: true,
        addedBy: true,
        partnerId: true,
      }
    });
    
    if (!existingCustomer) {
      return {
        isDuplicate: false,
        duplicateType: null,
        existingCustomer: null,
        message: 'Customer tidak ditemukan',
      };
    }
    
    // Determine duplicate type
    const phoneMatch = phoneVariations.some(p => 
      normalizePhone(existingCustomer.phone) === normalizePhone(p)
    );
    const nameMatch = name && existingCustomer.name.toLowerCase() === name.toLowerCase();
    
    let duplicateType: 'phone' | 'name' | 'both' = 'phone';
    if (phoneMatch && nameMatch) {
      duplicateType = 'both';
    } else if (nameMatch) {
      duplicateType = 'name';
    } else if (phoneMatch) {
      duplicateType = 'phone';
    }
    
    // Build informative message
    let message = '';
    if (duplicateType === 'both') {
      message = `Customer dengan nama "${name}" dan nomor ${phone} sudah ada di sistem`;
    } else if (duplicateType === 'name') {
      message = `Customer dengan nama "${name}" sudah ada di sistem dengan nomor ${existingCustomer.phone}`;
    } else {
      message = `Customer dengan nomor ${phone} sudah ada di sistem dengan nama "${existingCustomer.name}"`;
    }
    
    // Add additional info
    const addedByInfo = existingCustomer.addedBy === 'public' ? 'public' : existingCustomer.addedBy;
    message += ` (Ditambahkan oleh: ${addedByInfo}, Total transaksi: ${existingCustomer.totalTransactions})`;
    
    return {
      isDuplicate: true,
      duplicateType,
      existingCustomer: {
        ...existingCustomer,
        totalVolume: Number(existingCustomer.totalVolume),
      },
      message,
    };
  } catch (error) {
    console.error('Error finding existing customer:', error);
    return {
      isDuplicate: false,
      duplicateType: null,
      existingCustomer: null,
      message: 'Error checking for duplicate customer',
    };
  }
}

/**
 * Check customer duplicate with detailed response
 * Use this before creating or updating a customer
 */
export async function checkCustomerDuplicate(
  phone: string,
  name?: string,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  return findExistingCustomer(phone, name, excludeId);
}

/**
 * Format phone for display (08xxx format for Indonesian numbers)
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  
  // Convert to 08xxx format for display
  if (normalized.startsWith('62')) {
    return '0' + normalized.substring(2);
  }
  
  return phone;
}

/**
 * Format phone for WhatsApp link
 */
export function formatPhoneWhatsApp(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}`;
}

/**
 * Validate Indonesian phone number
 */
export function isValidIndonesianPhone(phone: string): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhone(phone);
  
  // Indonesian mobile numbers: 62 followed by 8-13 digits starting with 8
  // Total length should be 10-15 digits (including 62)
  const phoneRegex = /^62\d{8,13}$/;
  
  return phoneRegex.test(normalized);
}

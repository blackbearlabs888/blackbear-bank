import type { PaymentType, Marketplace, FeeCalculation, TransactionMethod } from '@/types'

/**
 * Calculate payment fee based on payment type, nominal, and method
 * COD Fee: Flat < 1,000,000 = 150,000, >= 1,000,000 = 15%
 * Online Fee: Flat < 1,000,000 = 100,000, >= 1,000,000 = 10%
 */
export function calculatePaymentFee(
  paymentType: PaymentType,
  nominal: number,
  method: TransactionMethod
): number {
  const threshold = paymentType.threshold
  
  if (method === 'ONLINE') {
    if (nominal >= threshold) {
      return nominal * paymentType.onlineFeePercent
    } else {
      return paymentType.onlineFeeFixed
    }
  } else {
    // COD
    if (nominal >= threshold) {
      return nominal * paymentType.codFeePercent
    } else {
      return paymentType.codFeeFixed
    }
  }
}

/**
 * Calculate platform fee from marketplace
 * NOTE: feePercent is stored as decimal (e.g., 0.0425 for 4.25%)
 * So we multiply directly without dividing by 100
 */
export function calculatePlatformFee(
  marketplace: Marketplace | null,
  nominal: number
): number {
  if (!marketplace) return 0
  // feePercent is already stored as decimal (0.0425 for 4.25%)
  return nominal * marketplace.feePercent
}

/**
 * Calculate all fees and profits for a transaction
 * 
 * FEE CALCULATION LOGIC:
 * ========================
 * 
 * RUMUS:
 * - Payment Fee = dari setting payment type (disimpan sebagai desimal: 0.1 untuk 10%)
 * - Platform Fee = Nominal × feePercent (disimpan sebagai desimal: 0.0425 untuk 4.25%)
 * - Net Margin = Payment Fee - Platform Fee
 * - Partner Profit = Net Margin × Partner Commission Rate
 * - Owner Profit = Net Margin - Partner Profit
 * - Diterima Customer = Nominal - Payment Fee
 * 
 * CONTOH KALKULASI DENGAN PARTNER:
 * Nominal: 5.000.000, Payment Fee: 500.000 (10%), Platform Fee: 212.500 (4.25%), Partner Rate: 30%
 * - Payment Fee = 5.000.000 × 0.10 = 500.000
 * - Platform Fee = 5.000.000 × 0.0425 = 212.500
 * - Net Margin = 500.000 - 212.500 = 287.500
 * - Partner Profit = 287.500 × 0.30 = 86.250
 * - Owner Profit = 287.500 - 86.250 = 201.250
 * - Diterima Customer = 5.000.000 - 500.000 = 4.500.000
 * 
 * CONTOH KALKULASI TANPA PARTNER:
 * - Net Margin = 287.500
 * - Partner Profit = 0
 * - Owner Profit = 287.500 (semua Net Margin untuk owner)
 */
export function calculateTransactionFees(
  nominal: number,
  paymentType: PaymentType,
  marketplace: Marketplace | null,
  method: TransactionMethod,
  partnerRate: number = 0 // 0 means no partner, 0.30 means 30% commission
): FeeCalculation {
  // Calculate payment fee (COD/Online fee) based on NOMINAL
  const paymentFee = calculatePaymentFee(paymentType, nominal, method)
  
  // Calculate platform fee from marketplace based on NOMINAL
  const platformFee = calculatePlatformFee(marketplace, nominal)
  
  // Net Margin = Payment Fee - Platform Fee
  // Ini adalah margin bersih yang akan dibagi antara owner dan partner
  const netMargin = paymentFee - platformFee
  
  let partnerProfit: number
  let ownerProfit: number
  
  if (partnerRate > 0) {
    // DENGAN PARTNER
    // Partner Profit = Net Margin × partnerCommission(%)
    partnerProfit = netMargin * partnerRate
    
    // Owner Profit = Net Margin - Partner Profit
    ownerProfit = netMargin - partnerProfit
  } else {
    // TANPA PARTNER
    // Semua Net Margin untuk owner
    partnerProfit = 0
    ownerProfit = netMargin
  }
  
  // Total service fee = payment fee + platform fee (total yang dipotong)
  const totalServiceFee = paymentFee + platformFee
  
  // Amount received by customer = Nominal - Payment Fee (sesuai payment fee yang dibayar customer)
  const receivedAmount = nominal - paymentFee
  
  return {
    paymentFee,
    platformFee,
    netMargin,
    partnerProfit,
    ownerProfit,
    totalServiceFee,
    receivedAmount
  }
}

/**
 * Format currency to Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date))
}

/**
 * Format date time
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days < 7) return `${days} hari lalu`
  
  return formatDate(date)
}

/**
 * Generate unique order ID
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `BB-${timestamp}-${random}`
}

/**
 * Validate WhatsApp number format (08xxx)
 */
export function validateWhatsApp(wa: string): boolean {
  return /^08[0-9]{8,12}$/.test(wa.replace(/[\s-]/g, ''))
}

/**
 * Format WhatsApp number
 */
export function formatWhatsApp(wa: string): string {
  const cleaned = wa.replace(/[\s-]/g, '')
  if (cleaned.startsWith('08')) {
    return cleaned
  }
  if (cleaned.startsWith('+62')) {
    return '0' + cleaned.slice(3)
  }
  if (cleaned.startsWith('62')) {
    return '0' + cleaned.slice(2)
  }
  return cleaned
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate password (min 6 characters)
 */
export function validatePassword(password: string): boolean {
  return password.length >= 6
}

/**
 * Get tier from profit amount
 */
export function getTierFromProfit(profit: number): string {
  if (profit >= 50000000) return 'Diamond'
  if (profit >= 25000000) return 'Platinum'
  if (profit >= 10000000) return 'Gold'
  if (profit >= 5000000) return 'Silver'
  return 'Bronze'
}

/**
 * Get tier progress percentage based on PROFIT (not volume)
 */
export function getTierProgress(profit: number): number {
  const tiers = [
    { name: 'Bronze', min: 0, max: 5000000 },
    { name: 'Silver', min: 5000000, max: 10000000 },
    { name: 'Gold', min: 10000000, max: 25000000 },
    { name: 'Platinum', min: 25000000, max: 50000000 },
    { name: 'Diamond', min: 50000000, max: Infinity }
  ]
  
  const currentTierIndex = tiers.findIndex(
    (tier) => profit >= tier.min && profit < tier.max
  )
  
  if (currentTierIndex === -1 || currentTierIndex === tiers.length - 1) {
    return 100
  }
  
  const currentTier = tiers[currentTierIndex]
  const nextTier = tiers[currentTierIndex + 1]
  const progress = ((profit - currentTier.min) / (nextTier.min - currentTier.min)) * 100
  
  return Math.min(100, Math.max(0, progress))
}

/**
 * Get gap to next tier based on PROFIT
 */
export function getGapToNextTier(profit: number): number {
  const tiers = [5000000, 10000000, 25000000, 50000000, Infinity]
  
  for (const threshold of tiers) {
    if (profit < threshold) {
      return threshold - profit
    }
  }
  
  return 0
}

/**
 * Calculate partner target progress based on PROFIT (not volume)
 */
export function calculateTargetProgress(totalProfit: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0
  return Math.min(100, (totalProfit / targetAmount) * 100)
}

/**
 * Truncate text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

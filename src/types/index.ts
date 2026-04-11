// ==================== USER & AUTH ====================

export type UserRole = 'OWNER' | 'PARTNER'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar: string | null
  createdAt: string
  updatedAt: string
}

// ==================== PARTNER ====================

export type PartnerTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
export type PartnerStatus = 'ACTIVE' | 'SUSPENDED'
export type PartnerBadge = 'Champion' | 'Top Performer' | 'Rising Star' | 'Veteran' | null

export interface Partner {
  id: string
  userId: string
  user?: User
  bankName: string
  accountNumber: string
  accountHolder: string
  city: string
  whatsapp: string
  tier: PartnerTier
  badge: PartnerBadge
  commissionRate: number
  targetAmount: number
  kpiTarget: number
  status: PartnerStatus
  totalProfit: number
  totalVolume: number
  totalTransactions: number
  createdAt: string
  updatedAt: string
}

// ==================== CUSTOMER ====================

export type CustomerLabel = 'VIP' | 'REGULAR' | 'NEW' | 'BLACKLIST'

export interface Customer {
  id: string
  partnerId: string | null
  partner?: Partner
  name: string
  whatsapp: string
  bank: string | null
  accountNumber: string | null
  accountHolder: string | null
  city: string | null
  label: CustomerLabel
  totalContribution: number
  totalTransactions: number
  totalVolume: number
  createdAt: string
  updatedAt: string
}

// ==================== TRANSACTION ====================

export type TransactionStatus = 'PENDING' | 'VERIFIED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
export type TransactionMethod = 'ONLINE' | 'COD'

export interface Transaction {
  id: string
  orderId: string
  customerId: string
  customer?: Customer
  partnerId: string | null
  partner?: Partner
  nominal: number
  paymentTypeId: string
  paymentType?: PaymentType
  marketplaceId: string | null
  marketplace?: Marketplace
  method: TransactionMethod
  paymentFee: number
  platformFee: number
  netMargin: number
  partnerProfit: number
  ownerProfit: number
  totalServiceFee: number
  receivedAmount: number
  status: TransactionStatus
  createdAt: string
  updatedAt: string
}

// ==================== PAYMENT TYPE ====================

export type PaymentTypeCategory = 'CC' | 'PAYLATER'
export type PaymentTypeStatus = 'ACTIVE' | 'INACTIVE'

export interface PaymentType {
  id: string
  name: string
  type: PaymentTypeCategory
  threshold: number
  onlineFeePercent: number
  onlineFeeFixed: number
  codFeePercent: number
  codFeeFixed: number
  status: PaymentTypeStatus
  createdAt: string
  updatedAt: string
}

// ==================== MARKETPLACE ====================

export type MarketplaceStatus = 'ACTIVE' | 'INACTIVE'

export interface Marketplace {
  id: string
  name: string
  feePercent: number
  logo: string | null
  status: MarketplaceStatus
  createdAt: string
  updatedAt: string
}

// ==================== ANNOUNCEMENT ====================

export type AnnouncementType = 'INFO' | 'PROMO'
export type AnnouncementStatus = 'ACTIVE' | 'INACTIVE'

export interface Announcement {
  id: string
  createdBy: string
  user?: User
  title: string
  description: string
  type: AnnouncementType
  link: string | null
  status: AnnouncementStatus
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  isRead?: boolean
}

// ==================== ANNOUNCEMENT READ ====================

export interface AnnouncementRead {
  id: string
  announcementId: string
  partnerId: string
  readAt: string
}

// ==================== MONTHLY RANKING ====================

export interface MonthlyRanking {
  id: string
  partnerId: string
  partner?: Partner
  year: number
  month: number
  profit: number
  volume: number
  transactions: number
  rank: number
  badge: PartnerBadge
  createdAt: string
}

// ==================== SITE CONFIG ====================

export interface SiteConfig {
  id: string
  ownerName: string
  ownerEmail: string
  ownerAvatar: string | null
  brandName: string
  logoUrl: string | null
  faviconUrl: string | null
  siteTitle: string
  metaDescription: string | null
  metaKeywords: string | null
  contactPhone: string | null
  contactWhatsapp: string | null
  contactEmail: string | null
  socialInstagram: string | null
  socialFacebook: string | null
  socialTiktok: string | null
  maintenanceMode: boolean
  maintenanceMessage: string | null
  updatedAt: string
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ==================== FORM DATA ====================

export interface LoginFormData {
  email: string
  password: string
  role: UserRole
}

export interface RegisterPartnerFormData {
  name: string
  email: string
  whatsapp: string
  password: string
  confirmPassword: string
  bankName: string
  accountNumber: string
  accountHolder: string
  city: string
}

export interface OrderFormData {
  name: string
  whatsapp: string
  bank: string
  accountNumber: string
  accountHolder: string
  nominal: number
  paymentTypeId: string
  method: TransactionMethod
  city: string
}

export interface TransactionFormData {
  customerId?: string
  newCustomer?: {
    name: string
    whatsapp: string
    bank?: string
    accountNumber?: string
    accountHolder?: string
    city?: string
    label: CustomerLabel
  }
  nominal: number
  marketplaceId?: string
  paymentTypeId: string
  method: TransactionMethod
  partnerId?: string | null
}

// ==================== STATS ====================

export interface DashboardStats {
  totalProfit: number
  totalTransactions: number
  totalVolume: number
  activePartners: number
  pendingOrders: number
  completedOrders: number
}

export interface PartnerStats {
  profit: number
  transactions: number
  volume: number
  pending: number
  tierProgress: number
  gapToNextRank: number
}

// ==================== PARTNER KPI ====================

export interface PartnerKPI {
  id: string
  partnerId: string
  year: number
  month: number
  totalProfit: number
  totalVolume: number
  totalTrans: number
  newCustomers: number
  avgTransaction: number
  targetProgress: number
  targetAchieved: boolean
  createdAt: string
}

export interface PartnerKPIWithTrend extends PartnerKPI {
  previousMonth?: PartnerKPI
  profitTrend: number
  volumeTrend: number
  transTrend: number
}

export interface PartnerKPISummary {
  currentMonth: PartnerKPIWithTrend
  monthlyData: PartnerKPI[]
  achievementHistory: Array<{
    year: number
    month: number
    achieved: boolean
    progress: number
  }>
  totalAchievements: number
  avgProgress: number
}

// ==================== CUSTOMER CONTRIBUTION ====================

export interface CustomerContribution {
  id: string
  name: string
  whatsapp: string
  city: string | null
  label: CustomerLabel
  totalContribution: number
  totalTransactions: number
  totalVolume: number
  contributionPercent: number
  rank: number
  partnerBreakdown: Array<{
    partnerId: string
    partnerName: string
    contribution: number
    transactions: number
  }>
}

// ==================== CALCULATOR ====================

export interface FeeCalculation {
  paymentFee: number
  platformFee: number
  netMargin: number
  partnerProfit: number
  ownerProfit: number
  totalServiceFee: number
  receivedAmount: number
}

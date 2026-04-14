// Black Bear WebApp - Type Definitions

export type UserRole = 'owner' | 'partner';

export type CustomerLabel = 'VIP' | 'Regular' | 'New' | 'Blacklist';

export type TransactionStatus = 'pending' | 'verification' | 'process' | 'success' | 'failed';

export type MethodTransaction = 'Online' | 'COD';

export type PartnerTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export type PartnerBadge = 'Newbie' | 'Rising Star' | 'Champion' | 'Legend';

export type PartnerStatus = 'active' | 'suspended';

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Partner types
export interface Partner {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  city: string;
  commission: number;
  target: number;
  tier: PartnerTier;
  badge: PartnerBadge;
  status: PartnerStatus;
  totalProfit: number;
  totalVolume: number;
  totalTransactions: number;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  phone: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  city?: string;
  label: CustomerLabel;
  totalVolume: number;
  totalTransactions: number;
  partnerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction types
export interface Transaction {
  id: string;
  orderId: string;
  customerId: string;
  partnerId?: string;
  nominal: number;
  paymentFee: number;
  originalFee: number;
  discountPercent: number;
  discountAmount: number;
  platformFee: number;
  netMargin: number;
  partnerProfit: number;
  ownerProfit: number;
  totalReceived: number;
  paymentTypeId: string;
  methodTransaction: MethodTransaction;
  marketplaceId?: string;
  status: TransactionStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer;
  partner?: Partner;
  paymentType?: PaymentType;
  marketplace?: Marketplace;
}

// Payment Type
export interface PaymentType {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  discountPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Marketplace
export interface Marketplace {
  id: string;
  name: string;
  feePercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Announcement
export interface Announcement {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  startDate: Date;
  expireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Promo
export interface Promo {
  id: string;
  title: string;
  link: string;
  isActive: boolean;
  startDate: Date;
  expireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Site Config
export interface SiteConfig {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// Owner Profile
export interface OwnerProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  websiteTitle: string;
  logoUrl?: string;
  faviconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  footerWhatsapp?: string;
  footerInstagram?: string;
  footerFacebook?: string;
  maintenanceMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  city: string;
}

// Order types
export interface OrderInput {
  name: string;
  phone: string;
  bank?: string;
  bankAccount?: string;
  bankHolder?: string;
  nominal: number;
  paymentTypeId: string;
  methodTransaction: MethodTransaction;
  city?: string;
}

// Stats types
export interface DashboardStats {
  totalProfit: number;
  totalTransactions: number;
  totalVolume: number;
  activePartners: number;
}

export interface MarginHealth {
  paymentType: string;
  avgMargin: number;
  totalVolume: number;
  transactionCount: number;
}

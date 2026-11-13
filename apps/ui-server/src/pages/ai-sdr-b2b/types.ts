export interface SdrB2BAgentOption {
  code: string;
  name: string;
  email: string;
  phone?: string;
}

export interface SdrInboxAccountItem {
  id: number;
  email: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
  dailyLimit: number;
  effectiveDailyLimit?: number;
  warmupWeek?: number;
  warmupEnabled?: boolean;
  sentToday: number;
  isActive: boolean;
  hasPassword?: boolean;
  healthStatus?: string;
  lastError?: string | null;
  lastTestedAt?: string | null;
  warmupStartedAt?: string | null;
  createdAt?: string;
}

export interface SdrMapsBudgetState {
  mode: 'free_tier' | 'daily_budget';
  dailyBudgetEur: number;
  callsToday: number;
  spentTodayEur: number;
  dailyCapCalls: number;
}

export interface SdrMapsBollaturaState {
  verifiedMapsCount: number;
  certifiedFreeCount: number;
  unverifiedMapsCount: number;
  totalCount: number;
}

export interface SdrOutreachConfigState {
  enableFirstPurchaseRule: boolean;
  istExtraDiscountPct: number;
  rivExtraDiscountPct: number;
  discountCalculationMode: 'EXTRA_CASCADE' | 'FIXED_OVERRIDE';
  discountTargetType: 'ALL_2GG' | 'ALL_CATALOG';
  offerTitle: string;
  minOrderAmountText: string;
  freeShippingText: string;
  paymentTermsText: string;
  customCommercialNotes: string;
  attachCatalogPdf: boolean;
  catalogSelectionMode: string;
  catalogWarehouse: string;
  catalogStockMode: string;
  catalogMaxProducts: number;
  catalogPriceMode: string;
  timeFencingEnabled: boolean;
  morningWindow: string;
  afternoonWindow: string;
  sentinelEnabled: boolean;
  defaultAgentCode?: string;
  defaultAgentName?: string;
  defaultAgentEmail?: string;
}

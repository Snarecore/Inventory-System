export type PlanType = "BUSINESS" | "PERSONAL";

export type CycleCode = "MONTHLY" | "SIX_MONTH" | "YEARLY" | "TWO_YEARLY" | string;

export interface BillingCycle {
  code: CycleCode;
  label: string;
  labelBn: string;
  months: number;
  discountPct?: number;
}

export interface PackagePrice {
  cycleCode: CycleCode;
  billingCycle?: CycleCode;
  baseMonthlyPrice: number;
  discountPct: number;
  finalPrice: number;
  currency: string;
}

export interface PricingPackage {
  id: number;
  code: "FREE" | "BASIC" | "PREMIUM" | "CUSTOM" | string;
  name: string;
  nameBn?: string;
  tagline?: string | null;
  taglineBn?: string | null;
  featured?: boolean;
  customPricing?: boolean;
  monthlyPrice?: number | null;
  prices?: PackagePrice[];
  packagePriceApplicable?: boolean;
}

export interface PricedPackage extends PricingPackage {
  total: number | null;
  perMonth: number | null;
  originalTotal?: number;
  originalPerMonth?: number;
  savePerMonth?: number;
  totalSave?: number;
  discountPct: number;
}

export interface PackageFeatureItem {
  feature: string;
  featureBn?: string;
  values: string[];
}

export interface FeatureGroup {
  category: string;
  categoryBn?: string;
  items: PackageFeatureItem[];
}

export interface PricingResponse {
  packageType?: string | null;
  packageId?: number | null;
  packageName?: string | null;
  packageStatus?: string | null;
  cycleCode?: string | null;
  cycleLabel?: string | null;
  cycleLabelBn?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  cycles: BillingCycle[];
  packages: PricingPackage[];
  featureGroups: FeatureGroup[];
}

export interface UserSubscription {
  packageType?: string | null;
  packageId?: number | null;
  packageName?: string | null;
  packageStatus?: string | null;
  cycleCode?: string | null;
  cycleLabel?: string | null;
  cycleLabelBn?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  cycles?: BillingCycle[];
  packages?: PricingPackage[];
  featureGroups?: FeatureGroup[];
}

export interface PaymentInitiatePayload {
  customerOrderId: string;
  customerId: string;
  packageId: number | string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  productCode?: string;
  cycleCode: string;
  accountType: string;
  userId?: number | string;
  requestAgent: string;
  startDate: string;
  endDate: string;
}

export interface PaymentInitiateResponse {
  status?: string;
  redirectURL?: string;
  RedirectURL?: string;
  redirectUrl?: string;
  checkoutUrl?: string;
  url?: string;
  errorMessage?: string;
  ErrorMessage?: string;
  message?: string;
}

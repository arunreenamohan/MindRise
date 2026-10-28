/**
 * In-App Purchase & Entitlement Types
 *
 * MindRise Cognitive Training Application
 * Strict TypeScript models for IAP products, subscriptions, entitlements,
 * offline cached receipts, and error definitions. Zero `any` types.
 */

export const MINDRISE_SKUS = {
  MONTHLY: 'mindrise_pro_monthly',
  ANNUAL: 'mindrise_pro_annual',
  LIFETIME: 'mindrise_pro_lifetime',
} as const;

export const SUBSCRIPTION_SKUS = [
  MINDRISE_SKUS.MONTHLY,
  MINDRISE_SKUS.ANNUAL,
] as const;

export const LIFETIME_SKUS = [
  MINDRISE_SKUS.LIFETIME,
] as const;

export const ALL_MINDRISE_SKUS = [
  MINDRISE_SKUS.MONTHLY,
  MINDRISE_SKUS.ANNUAL,
  MINDRISE_SKUS.LIFETIME,
] as const;

export type ProductSku = (typeof ALL_MINDRISE_SKUS)[number];
export type SubscriptionSku = (typeof SUBSCRIPTION_SKUS)[number];
export type LifetimeSku = (typeof LIFETIME_SKUS)[number];

export const IAP_STORAGE_KEYS = {
  PRO_ENTITLED: '@mindrise_pro_entitled',
  RECEIPT_CACHE: '@mindrise_pro_receipt_cache',
} as const;

/**
 * Feature gates managed by MindRise Pro entitlements.
 */
export type ProFeatureId = 'unlimited_drills' | 'max_difficulty' | 'full_analytics';

/**
 * Subscription lifecycle status.
 */
export type SubscriptionLifecycle = 'active' | 'expired' | 'grace_period' | 'none';

/**
 * Detailed subscription status.
 */
export interface SubscriptionStatus {
  isSubscribed: boolean;
  planId: SubscriptionSku | null;
  expirationDate: number | null; // Epoch milliseconds
  isAutoRenewing?: boolean;
  isGracePeriod?: boolean;
  status: SubscriptionLifecycle;
}

/**
 * Source of the active entitlement.
 */
export type EntitlementSource = 'local_cache' | 'store_verified' | 'restored' | 'none';

/**
 * Core entitlement state representing active privileges in the application.
 * Persisted locally to enable 100% offline access in airplane mode.
 */
export interface EntitlementState {
  isPro: boolean;
  activePlan: ProductSku | null;
  planType: 'subscription' | 'lifetime' | 'none';
  entitlementSource: EntitlementSource;
  expirationDate: number | null; // Epoch ms; null for lifetime or none
  lastVerifiedAt: number; // Epoch ms
  features: Record<ProFeatureId, boolean>;
}

/**
 * Display and pricing details for a purchase plan presented in the UI.
 */
export interface PurchasePlan {
  sku: ProductSku;
  type: 'subs' | 'in-app';
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
  period?: 'monthly' | 'annual' | 'lifetime';
  offerToken?: string; // Android Google Play Billing requirement for subscriptions
}

/**
 * Structured error model for IAP failures with domain separation.
 */
export interface IAPError {
  code: string;
  message: string;
  domain: 'connection' | 'purchase' | 'restore' | 'acknowledgment' | 'verification';
  originalError?: unknown;
}

/**
 * Outcome of a purchase restoration operation.
 */
export interface RestoreResult {
  success: boolean;
  restoredCount: number;
  isPro: boolean;
  error?: string;
}

/**
 * Offline cached receipt record for proof-of-purchase without network access.
 */
export interface CachedReceiptRecord {
  productId: string;
  purchaseToken?: string;
  transactionId?: string;
  transactionDate: number;
  acknowledged: boolean;
  platform: 'android' | 'ios' | 'other';
  cachedAt: number;
}

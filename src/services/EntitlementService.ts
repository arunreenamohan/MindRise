/**
 * Entitlement & In-App Purchase Service
 *
 * MindRise Cognitive Training Application
 * Robust, production-grade In-App Purchase and Entitlement engine using react-native-iap (v12+).
 *
 * Architecture Principles:
 * 1. Zero-Telemetry & Local-First: Verified entitlement state is saved in AsyncStorage
 *    (@mindrise_pro_entitled). The user retains Pro benefits 100% offline (airplane mode).
 * 2. Google Play Lifecycle: Automatically acknowledges purchases (acknowledgePurchaseAndroid)
 *    and finalizes transactions (finishTransaction) to prevent Google Play 3-day auto-refunds.
 * 3. Strict Type Safety: Zero `any` types throughout the service.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initConnection,
  endConnection,
  fetchProducts,
  getAvailablePurchases,
  requestPurchase,
  finishTransaction,
  acknowledgePurchaseAndroid,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
  type EventSubscription,
  type PurchaseAndroid,
} from 'react-native-iap';
import {
  ALL_MINDRISE_SKUS,
  MINDRISE_SKUS,
  SUBSCRIPTION_SKUS,
  IAP_STORAGE_KEYS,
  type ProductSku,
  type ProFeatureId,
  type EntitlementState,
  type EntitlementSource,
  type PurchasePlan,
  type IAPError,
  type RestoreResult,
  type CachedReceiptRecord,
} from '../types/iap';

/**
 * Baseline unentitled state for standard users.
 */
export const DEFAULT_FREE_ENTITLEMENT_STATE: EntitlementState = {
  isPro: false,
  activePlan: null,
  planType: 'none',
  entitlementSource: 'none',
  expirationDate: null,
  lastVerifiedAt: 0,
  features: {
    unlimited_drills: false,
    max_difficulty: false,
    full_analytics: false,
  },
};

/**
 * Builds an active Pro entitlement state.
 */
export function buildProEntitlementState(
  sku: ProductSku,
  source: EntitlementSource,
  expirationDate: number | null = null,
  verifiedAt: number = Date.now()
): EntitlementState {
  const isLifetime = sku === MINDRISE_SKUS.LIFETIME;
  return {
    isPro: true,
    activePlan: sku,
    planType: isLifetime ? 'lifetime' : 'subscription',
    entitlementSource: source,
    expirationDate: isLifetime ? null : expirationDate,
    lastVerifiedAt: verifiedAt,
    features: {
      unlimited_drills: true,
      max_difficulty: true,
      full_analytics: true,
    },
  };
}

export class EntitlementService {
  private entitlementState: EntitlementState = { ...DEFAULT_FREE_ENTITLEMENT_STATE };
  private listeners: Set<(state: EntitlementState) => void> = new Set();
  private errorListeners: Set<(error: IAPError) => void> = new Set();
  private isInitialized = false;
  private isConnecting = false;
  private isStoreConnected = false;
  private purchaseUpdateSubscription: EventSubscription | null = null;
  private purchaseErrorSubscription: EventSubscription | null = null;

  /**
   * Initializes the entitlement engine:
   * 1. Hydrates cached entitlement state from AsyncStorage immediately (works offline).
   * 2. Initializes store connection in the background if network is reachable.
   * 3. Attaches Google Play / StoreKit purchase listeners.
   */
  public async initialize(): Promise<EntitlementState> {
    if (this.isInitialized) {
      return this.entitlementState;
    }

    // Step 1: Read locally cached state immediately (Airplane-mode / Offline first)
    await this.hydrateFromLocalCache();

    // Step 2: Set up native IAP connection & listeners
    await this.setupNativeConnection();

    this.isInitialized = true;
    return this.entitlementState;
  }

  /**
   * Hydrates entitlement state from AsyncStorage without any external network dependency.
   */
  public async hydrateFromLocalCache(): Promise<EntitlementState> {
    try {
      const rawCached = await AsyncStorage.getItem(IAP_STORAGE_KEYS.PRO_ENTITLED);
      if (rawCached) {
        const parsed = JSON.parse(rawCached) as EntitlementState;

        // Verify expiration for time-limited subscriptions
        if (parsed.isPro) {
          const now = Date.now();
          if (parsed.planType === 'lifetime') {
            // Lifetime plans never expire
            this.entitlementState = {
              ...parsed,
              entitlementSource: 'local_cache',
            };
          } else if (parsed.expirationDate === null || parsed.expirationDate > now) {
            // Active subscription within validity period
            this.entitlementState = {
              ...parsed,
              entitlementSource: 'local_cache',
            };
          } else {
            // Subscription expired while offline
            this.entitlementState = { ...DEFAULT_FREE_ENTITLEMENT_STATE };
            await this.persistEntitlementState(this.entitlementState);
          }
        }
      }
    } catch {
      // Graceful fallback to default free state if cache read fails
      this.entitlementState = { ...DEFAULT_FREE_ENTITLEMENT_STATE };
    }

    this.notifyListeners();
    return this.entitlementState;
  }

  /**
   * Connects to the platform billing client and registers native listeners.
   */
  private async setupNativeConnection(): Promise<void> {
    if (this.isConnecting || this.isStoreConnected) {
      return;
    }
    this.isConnecting = true;

    try {
      const connected = await initConnection();
      this.isStoreConnected = Boolean(connected);

      // Register purchase update listener
      if (!this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription = purchaseUpdatedListener(
          async (purchase: Purchase) => {
            await this.handlePurchaseUpdate(purchase);
          }
        );
      }

      // Register purchase error listener
      if (!this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription = purchaseErrorListener(
          (error: PurchaseError) => {
            this.handlePurchaseError(error);
          }
        );
      }

      // If online, perform silent synchronization against available purchases
      if (this.isStoreConnected) {
        await this.syncAvailablePurchasesSilently();
      }
    } catch (error) {
      // Offline mode: Connection failure is non-fatal; user retains cached entitlement
      this.isStoreConnected = false;
      this.notifyError({
        code: 'CONNECTION_FAILED',
        message: 'Could not connect to store billing service. Offline cache active.',
        domain: 'connection',
        originalError: error,
      });
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Handles purchase events from purchaseUpdatedListener.
   * Crucial for Google Play: Acknowledges purchase to prevent auto-refunds.
   */
  public async handlePurchaseUpdate(purchase: Purchase): Promise<boolean> {
    const sku = purchase.productId as ProductSku;
    if (!ALL_MINDRISE_SKUS.includes(sku)) {
      return false;
    }

    try {
      // 1. Google Play Acknowledgment (Android only)
      if (Platform.OS === 'android') {
        const androidPurchase = purchase as PurchaseAndroid;
        const isAlreadyAcknowledged = Boolean(androidPurchase.isAcknowledgedAndroid);
        const purchaseToken = purchase.purchaseToken;

        if (!isAlreadyAcknowledged && purchaseToken) {
          try {
            await acknowledgePurchaseAndroid(purchaseToken);
          } catch (ackErr) {
            // If already acknowledged by another thread or store, proceed safely
            this.notifyError({
              code: 'ACKNOWLEDGE_WARNING',
              message: 'Acknowledgment call returned warning or was already acknowledged.',
              domain: 'acknowledgment',
              originalError: ackErr,
            });
          }
        }
      }

      // 2. Finalize transaction to clear from store queue (iOS & Android)
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        // Safe to ignore if already finished
      }

      // 3. Cache receipt for offline proof
      await this.saveReceiptRecord(purchase, true);

      // 4. Update and persist active Pro entitlement state
      const newState = buildProEntitlementState(sku, 'store_verified');
      await this.persistEntitlementState(newState);

      return true;
    } catch (error) {
      this.notifyError({
        code: 'PURCHASE_UPDATE_FAILED',
        message: 'Failed to process and acknowledge purchase update.',
        domain: 'purchase',
        originalError: error,
      });
      return false;
    }
  }

  /**
   * Dispatches purchase errors received from native store listener.
   */
  private handlePurchaseError(error: PurchaseError): void {
    this.notifyError({
      code: String(error.code ?? 'UNKNOWN_PURCHASE_ERROR'),
      message: error.message || 'An error occurred during purchase processing.',
      domain: 'purchase',
      originalError: error,
    });
  }

  /**
   * Silently synchronizes available purchases from the store without blocking UI.
   */
  private async syncAvailablePurchasesSilently(): Promise<void> {
    try {
      const purchases = await getAvailablePurchases();
      if (!Array.isArray(purchases) || purchases.length === 0) {
        return;
      }

      // Look for any active MindRise Pro product
      const matchingPurchase = purchases.find((p) =>
        ALL_MINDRISE_SKUS.includes(p.productId as ProductSku)
      );

      if (matchingPurchase) {
        await this.handlePurchaseUpdate(matchingPurchase);
      }
    } catch {
      // Silent sync failures should not disrupt user experience
    }
  }

  /**
   * Initiates a purchase flow for a specified plan.
   */
  public async purchasePlan(sku: ProductSku, offerToken?: string): Promise<void> {
    if (!this.isStoreConnected) {
      await this.setupNativeConnection();
    }

    const isSubscription = (SUBSCRIPTION_SKUS as readonly string[]).includes(sku);

    if (Platform.OS === 'android') {
      if (isSubscription) {
        await requestPurchase({
          type: 'subs',
          request: {
            google: {
              skus: [sku],
              subscriptionOffers: offerToken ? [{ sku, offerToken }] : undefined,
            },
          },
        });
      } else {
        await requestPurchase({
          type: 'in-app',
          request: {
            google: {
              skus: [sku],
            },
          },
        });
      }
    } else {
      // iOS / StoreKit
      await requestPurchase({
        type: isSubscription ? 'subs' : 'in-app',
        request: {
          apple: {
            sku,
          },
        },
      });
    }
  }

  /**
   * Restores historical purchases from the store and updates local entitlements.
   */
  public async restorePurchases(): Promise<RestoreResult> {
    try {
      if (!this.isStoreConnected) {
        await this.setupNativeConnection();
      }

      const purchases = await getAvailablePurchases();
      if (!Array.isArray(purchases) || purchases.length === 0) {
        return {
          success: true,
          restoredCount: 0,
          isPro: this.entitlementState.isPro,
        };
      }

      const validPurchases = purchases.filter((p) =>
        ALL_MINDRISE_SKUS.includes(p.productId as ProductSku)
      );

      if (validPurchases.length === 0) {
        return {
          success: true,
          restoredCount: 0,
          isPro: this.entitlementState.isPro,
        };
      }

      // Process and acknowledge all restored purchases
      for (const purchase of validPurchases) {
        await this.handlePurchaseUpdate(purchase);
      }

      return {
        success: true,
        restoredCount: validPurchases.length,
        isPro: this.entitlementState.isPro,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to restore purchases.';
      this.notifyError({
        code: 'RESTORE_FAILED',
        message: errorMsg,
        domain: 'restore',
        originalError: error,
      });

      return {
        success: false,
        restoredCount: 0,
        isPro: this.entitlementState.isPro,
        error: errorMsg,
      };
    }
  }

  /**
   * Feature gate evaluation helper.
   * Checks whether a feature is unlocked under the current entitlement state.
   */
  public async isFeatureUnlocked(featureId: ProFeatureId): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.isFeatureUnlockedSync(featureId);
  }

  /**
   * Synchronous feature gate check against the current memory-cached entitlement state.
   */
  public isFeatureUnlockedSync(featureId: ProFeatureId): boolean {
    if (this.entitlementState.isPro) {
      return true;
    }
    return this.entitlementState.features[featureId] ?? false;
  }

  /**
   * Returns current entitlement state (ensuring initialization).
   */
  public async getEntitlementState(): Promise<EntitlementState> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.entitlementState;
  }

  /**
   * Returns current entitlement state synchronously from memory cache.
   */
  public getEntitlementStateSync(): EntitlementState {
    return this.entitlementState;
  }

  /**
   * Synchronous check whether user currently has active Pro entitlement.
   */
  public isProSync(): boolean {
    return this.entitlementState.isPro;
  }

  /**
   * Fetches product metadata and localized prices from the store for all MindRise SKUs.
   */
  public async getAvailablePlans(): Promise<PurchasePlan[]> {
    try {
      if (!this.isStoreConnected) {
        await this.setupNativeConnection();
      }

      const products = await fetchProducts({
        skus: [...ALL_MINDRISE_SKUS],
        type: 'all',
      });

      if (!Array.isArray(products) || products.length === 0) {
        return this.getDefaultPlans();
      }

      return products
        .map((prod) => {
          const rawId = ('id' in prod && typeof prod.id === 'string')
            ? prod.id
            : ('productId' in prod && typeof (prod as { productId?: unknown }).productId === 'string')
            ? (prod as { productId: string }).productId
            : '';
          const sku = rawId as ProductSku;
          const isSub = (SUBSCRIPTION_SKUS as readonly string[]).includes(sku);
          let period: 'monthly' | 'annual' | 'lifetime' = 'lifetime';
          if (sku === MINDRISE_SKUS.MONTHLY) period = 'monthly';
          if (sku === MINDRISE_SKUS.ANNUAL) period = 'annual';

          const priceStr = prod.price !== undefined && prod.price !== null ? String(prod.price) : '';
          const displayPriceStr = prod.displayPrice || (priceStr ? `$${priceStr}` : '');

          return {
            sku,
            type: isSub ? ('subs' as const) : ('in-app' as const),
            title: prod.title || sku,
            description: prod.description || '',
            price: priceStr,
            currency: prod.currency || 'USD',
            localizedPrice: displayPriceStr,
            period,
          };
        })
        .filter((plan) => ALL_MINDRISE_SKUS.includes(plan.sku));
    } catch {
      return this.getDefaultPlans();
    }
  }

  /**
   * Fallback plans when store query is unavailable offline.
   */
  public getDefaultPlans(): PurchasePlan[] {
    return [
      {
        sku: MINDRISE_SKUS.MONTHLY,
        type: 'subs',
        title: 'MindRise Pro Monthly',
        description: 'Unlimited workouts, maximum adaptive difficulty, and full analytics.',
        price: '4.99',
        currency: 'USD',
        localizedPrice: '$4.99 / mo',
        period: 'monthly',
      },
      {
        sku: MINDRISE_SKUS.ANNUAL,
        type: 'subs',
        title: 'MindRise Pro Annual',
        description: 'Best value: 12 months of unlimited mental workouts.',
        price: '29.99',
        currency: 'USD',
        localizedPrice: '$29.99 / yr',
        period: 'annual',
      },
      {
        sku: MINDRISE_SKUS.LIFETIME,
        type: 'in-app',
        title: 'MindRise Pro Lifetime',
        description: 'One-time purchase. Lifetime unlimited cognitive access.',
        price: '59.99',
        currency: 'USD',
        localizedPrice: '$59.99',
        period: 'lifetime',
      },
    ];
  }

  /**
   * Persists active entitlement state into AsyncStorage.
   */
  private async persistEntitlementState(state: EntitlementState): Promise<void> {
    this.entitlementState = state;
    try {
      await AsyncStorage.setItem(IAP_STORAGE_KEYS.PRO_ENTITLED, JSON.stringify(state));
    } catch {
      // Storage error logged silently
    }
    this.notifyListeners();
  }

  /**
   * Saves a receipt record locally for offline verification.
   */
  private async saveReceiptRecord(purchase: Purchase, acknowledged: boolean): Promise<void> {
    try {
      const rawCache = await AsyncStorage.getItem(IAP_STORAGE_KEYS.RECEIPT_CACHE);
      const existing: CachedReceiptRecord[] = rawCache ? JSON.parse(rawCache) : [];

      const newRecord: CachedReceiptRecord = {
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken ?? undefined,
        transactionId: purchase.transactionId ?? undefined,
        transactionDate: purchase.transactionDate || Date.now(),
        acknowledged,
        platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'other',
        cachedAt: Date.now(),
      };

      const updated = [newRecord, ...existing.filter((r) => r.productId !== purchase.productId)];
      await AsyncStorage.setItem(IAP_STORAGE_KEYS.RECEIPT_CACHE, JSON.stringify(updated.slice(0, 10)));
    } catch {
      // Non-critical cache write error
    }
  }

  /**
   * Subscribes a listener to entitlement changes.
   * Returns an unsubscribe callback function.
   */
  public subscribe(listener: (state: EntitlementState) => void): () => void {
    this.listeners.add(listener);
    listener(this.entitlementState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribes an error listener for IAP failures.
   */
  public onError(listener: (error: IAPError) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.entitlementState);
      } catch {
        // Listener error isolated
      }
    }
  }

  private notifyError(error: IAPError): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch {
        // Error listener error isolated
      }
    }
  }

  /**
   * Resets entitlement state to unentitled for development or testing.
   */
  public async resetEntitlementForTesting(): Promise<void> {
    this.entitlementState = { ...DEFAULT_FREE_ENTITLEMENT_STATE };
    await AsyncStorage.removeItem(IAP_STORAGE_KEYS.PRO_ENTITLED);
    await AsyncStorage.removeItem(IAP_STORAGE_KEYS.RECEIPT_CACHE);
    this.notifyListeners();
  }

  /**
   * Sets active entitlement state directly for unit or integration testing.
   */
  public async setEntitlementForTesting(sku: ProductSku = MINDRISE_SKUS.LIFETIME): Promise<void> {
    const proState = buildProEntitlementState(sku, 'local_cache');
    await this.persistEntitlementState(proState);
  }

  /**
   * Teardown method to release native connection and event listeners.
   */
  public async destroy(): Promise<void> {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    this.listeners.clear();
    this.errorListeners.clear();

    try {
      await endConnection();
    } catch {
      // Ignore teardown disconnect errors
    }

    this.isStoreConnected = false;
    this.isInitialized = false;
  }
}

/**
 * Shared singleton instance of EntitlementService.
 */
export const entitlementService = new EntitlementService();

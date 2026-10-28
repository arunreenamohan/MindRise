/**
 * EntitlementService Unit & Integration Tests
 *
 * MindRise Cognitive Training Application
 * Tests for zero-telemetry offline persistence, Google Play acknowledgment,
 * restore purchases, feature gating, and listener lifecycles.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
import {
  EntitlementService,
  DEFAULT_FREE_ENTITLEMENT_STATE,
} from '../src/services/EntitlementService';
import {
  MINDRISE_SKUS,
  IAP_STORAGE_KEYS,
  type EntitlementState,
  type CachedReceiptRecord,
} from '../src/types/iap';

describe('EntitlementService', () => {
  let service: EntitlementService;
  let capturedPurchaseListener: ((purchase: unknown) => void) | null = null;
  let capturedErrorListener: ((error: unknown) => void) | null = null;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();

    capturedPurchaseListener = null;
    capturedErrorListener = null;

    (RNIap.purchaseUpdatedListener as jest.Mock).mockImplementation((listener) => {
      capturedPurchaseListener = listener;
      return { remove: jest.fn() };
    });

    (RNIap.purchaseErrorListener as jest.Mock).mockImplementation((listener) => {
      capturedErrorListener = listener;
      return { remove: jest.fn() };
    });

    (RNIap.initConnection as jest.Mock).mockResolvedValue(true);
    (RNIap.getAvailablePurchases as jest.Mock).mockResolvedValue([]);
    (RNIap.acknowledgePurchaseAndroid as jest.Mock).mockResolvedValue(true);
    (RNIap.finishTransaction as jest.Mock).mockResolvedValue(undefined);

    service = new EntitlementService();
  });

  afterEach(async () => {
    await service.destroy();
  });

  describe('1. Initial State & Defaults', () => {
    it('initializes with default free state when no cached entitlement exists', async () => {
      const state = await service.initialize();

      expect(state.isPro).toBe(false);
      expect(state.activePlan).toBeNull();
      expect(state.planType).toBe('none');
      expect(state.entitlementSource).toBe('none');
      expect(state.features.unlimited_drills).toBe(false);
      expect(state.features.max_difficulty).toBe(false);
      expect(state.features.full_analytics).toBe(false);
    });

    it('returns false for all feature gates when unentitled', async () => {
      await service.initialize();

      const unlimited = await service.isFeatureUnlocked('unlimited_drills');
      const maxDiff = await service.isFeatureUnlocked('max_difficulty');
      const fullAnalytics = await service.isFeatureUnlocked('full_analytics');

      expect(unlimited).toBe(false);
      expect(maxDiff).toBe(false);
      expect(fullAnalytics).toBe(false);
      expect(service.isFeatureUnlockedSync('unlimited_drills')).toBe(false);
    });

    it('returns default fallback plans when offline or store returns empty', async () => {
      (RNIap.fetchProducts as jest.Mock).mockResolvedValue([]);

      const plans = await service.getAvailablePlans();

      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.sku)).toEqual([
        MINDRISE_SKUS.MONTHLY,
        MINDRISE_SKUS.ANNUAL,
        MINDRISE_SKUS.LIFETIME,
      ]);
    });
  });

  describe('2. Offline Cached Retrieval & Zero-Telemetry', () => {
    it('hydrates lifetime Pro entitlement from AsyncStorage without network connection', async () => {
      // Simulate existing verified lifetime entitlement in AsyncStorage
      const cachedLifetimeState: EntitlementState = {
        isPro: true,
        activePlan: MINDRISE_SKUS.LIFETIME,
        planType: 'lifetime',
        entitlementSource: 'store_verified',
        expirationDate: null,
        lastVerifiedAt: Date.now() - 100000,
        features: {
          unlimited_drills: true,
          max_difficulty: true,
          full_analytics: true,
        },
      };

      await AsyncStorage.setItem(
        IAP_STORAGE_KEYS.PRO_ENTITLED,
        JSON.stringify(cachedLifetimeState)
      );

      // Simulate offline / connection failure
      (RNIap.initConnection as jest.Mock).mockRejectedValueOnce(
        new Error('Network unavailable (airplane mode)')
      );

      const state = await service.initialize();

      expect(state.isPro).toBe(true);
      expect(state.activePlan).toBe(MINDRISE_SKUS.LIFETIME);
      expect(state.planType).toBe('lifetime');
      expect(state.entitlementSource).toBe('local_cache');

      // Feature gates must be unlocked offline
      expect(await service.isFeatureUnlocked('unlimited_drills')).toBe(true);
      expect(await service.isFeatureUnlocked('max_difficulty')).toBe(true);
      expect(await service.isFeatureUnlocked('full_analytics')).toBe(true);
      expect(service.isFeatureUnlockedSync('unlimited_drills')).toBe(true);
    });

    it('hydrates active subscription if expirationDate is in the future', async () => {
      const futureExpiry = Date.now() + 86400000 * 15; // 15 days in future
      const cachedSubState: EntitlementState = {
        isPro: true,
        activePlan: MINDRISE_SKUS.MONTHLY,
        planType: 'subscription',
        entitlementSource: 'store_verified',
        expirationDate: futureExpiry,
        lastVerifiedAt: Date.now(),
        features: {
          unlimited_drills: true,
          max_difficulty: true,
          full_analytics: true,
        },
      };

      await AsyncStorage.setItem(
        IAP_STORAGE_KEYS.PRO_ENTITLED,
        JSON.stringify(cachedSubState)
      );

      const state = await service.hydrateFromLocalCache();

      expect(state.isPro).toBe(true);
      expect(state.activePlan).toBe(MINDRISE_SKUS.MONTHLY);
      expect(state.planType).toBe('subscription');
      expect(state.expirationDate).toBe(futureExpiry);
    });

    it('demotes expired subscription back to free state on hydration', async () => {
      const pastExpiry = Date.now() - 86400000; // 1 day ago
      const expiredSubState: EntitlementState = {
        isPro: true,
        activePlan: MINDRISE_SKUS.MONTHLY,
        planType: 'subscription',
        entitlementSource: 'store_verified',
        expirationDate: pastExpiry,
        lastVerifiedAt: Date.now() - 100000,
        features: {
          unlimited_drills: true,
          max_difficulty: true,
          full_analytics: true,
        },
      };

      await AsyncStorage.setItem(
        IAP_STORAGE_KEYS.PRO_ENTITLED,
        JSON.stringify(expiredSubState)
      );

      const state = await service.hydrateFromLocalCache();

      expect(state.isPro).toBe(false);
      expect(state.activePlan).toBeNull();
      expect(state.features.unlimited_drills).toBe(false);

      // Verifies storage was updated to free state
      const savedStorage = await AsyncStorage.getItem(IAP_STORAGE_KEYS.PRO_ENTITLED);
      expect(JSON.parse(savedStorage!)).toEqual(DEFAULT_FREE_ENTITLEMENT_STATE);
    });
  });

  describe('3. Purchase Lifecycle & Google Play Acknowledgment', () => {
    it('acknowledges unacknowledged Android purchases and finalizes transactions', async () => {
      Platform.OS = 'android';
      await service.initialize();

      const mockAndroidPurchase = {
        productId: MINDRISE_SKUS.MONTHLY,
        purchaseToken: 'test_token_abc_123',
        isAcknowledgedAndroid: false,
        transactionDate: Date.now(),
        transactionId: 'trans_987',
      };

      const result = await service.handlePurchaseUpdate(mockAndroidPurchase as any);

      expect(result).toBe(true);

      // Must call acknowledgePurchaseAndroid to prevent Google Play 3-day refund
      expect(RNIap.acknowledgePurchaseAndroid).toHaveBeenCalledWith('test_token_abc_123');

      // Must call finishTransaction
      expect(RNIap.finishTransaction).toHaveBeenCalledWith({
        purchase: mockAndroidPurchase,
        isConsumable: false,
      });

      // State is now Pro
      const current = service.getEntitlementStateSync();
      expect(current.isPro).toBe(true);
      expect(current.activePlan).toBe(MINDRISE_SKUS.MONTHLY);
      expect(current.entitlementSource).toBe('store_verified');

      // Receipt cached locally
      const rawReceipts = await AsyncStorage.getItem(IAP_STORAGE_KEYS.RECEIPT_CACHE);
      const receipts: CachedReceiptRecord[] = JSON.parse(rawReceipts!);
      expect(receipts).toHaveLength(1);
      expect(receipts[0].productId).toBe(MINDRISE_SKUS.MONTHLY);
      expect(receipts[0].purchaseToken).toBe('test_token_abc_123');
      expect(receipts[0].acknowledged).toBe(true);
    });

    it('does not re-acknowledge purchases that are already marked acknowledged', async () => {
      Platform.OS = 'android';
      await service.initialize();

      const alreadyAckedPurchase = {
        productId: MINDRISE_SKUS.ANNUAL,
        purchaseToken: 'token_already_acked',
        isAcknowledgedAndroid: true,
        transactionDate: Date.now(),
      };

      await service.handlePurchaseUpdate(alreadyAckedPurchase as any);

      expect(RNIap.acknowledgePurchaseAndroid).not.toHaveBeenCalled();
      expect(RNIap.finishTransaction).toHaveBeenCalledWith({
        purchase: alreadyAckedPurchase,
        isConsumable: false,
      });

      const current = service.getEntitlementStateSync();
      expect(current.isPro).toBe(true);
      expect(current.activePlan).toBe(MINDRISE_SKUS.ANNUAL);
    });

    it('ignores purchases with unrecognized SKUs without altering state', async () => {
      await service.initialize();

      const unknownPurchase = {
        productId: 'some_other_app_sku',
        purchaseToken: 'token_xyz',
      };

      const result = await service.handlePurchaseUpdate(unknownPurchase as any);

      expect(result).toBe(false);
      expect(service.getEntitlementStateSync().isPro).toBe(false);
    });

    it('automatically handles purchase updates when native purchaseUpdatedListener fires', async () => {
      await service.initialize();
      expect(capturedPurchaseListener).toBeDefined();

      const purchasePayload = {
        productId: MINDRISE_SKUS.ANNUAL,
        transactionDate: Date.now(),
      };

      capturedPurchaseListener!(purchasePayload);

      // Wait a tick for async handler
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(service.getEntitlementStateSync().isPro).toBe(true);
      expect(service.getEntitlementStateSync().activePlan).toBe(MINDRISE_SKUS.ANNUAL);
    });

    it('handles purchase listener errors without crashing or dropping existing state', async () => {
      await service.initialize();

      let emittedError: unknown = null;
      service.onError((err) => {
        emittedError = err;
      });

      expect(capturedErrorListener).toBeDefined();

      capturedErrorListener!({
        code: 'E_USER_CANCELLED',
        message: 'Payment cancelled by user.',
      });

      expect(emittedError).toEqual(
        expect.objectContaining({
          code: 'E_USER_CANCELLED',
          domain: 'purchase',
        })
      );
    });
  });

  describe('4. Restore Purchases Flow', () => {
    it('restores historical purchase, acknowledges it, and updates local entitlement', async () => {
      Platform.OS = 'android';

      (RNIap.getAvailablePurchases as jest.Mock).mockResolvedValue([
        {
          productId: MINDRISE_SKUS.LIFETIME,
          purchaseToken: 'restored_lifetime_token',
          isAcknowledgedAndroid: false,
          transactionDate: Date.now() - 50000,
        },
      ]);

      const restoreResult = await service.restorePurchases();

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredCount).toBe(1);
      expect(restoreResult.isPro).toBe(true);

      // Verify Google Play acknowledgment on restored item
      expect(RNIap.acknowledgePurchaseAndroid).toHaveBeenCalledWith('restored_lifetime_token');

      // Verify state is Pro
      expect(service.getEntitlementStateSync().isPro).toBe(true);
      expect(service.getEntitlementStateSync().activePlan).toBe(MINDRISE_SKUS.LIFETIME);
      expect(service.getEntitlementStateSync().planType).toBe('lifetime');

      // Feature gate is unlocked
      expect(await service.isFeatureUnlocked('full_analytics')).toBe(true);
    });

    it('returns restoredCount: 0 if no MindRise purchases exist in store account', async () => {
      (RNIap.getAvailablePurchases as jest.Mock).mockResolvedValue([]);

      const restoreResult = await service.restorePurchases();

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredCount).toBe(0);
      expect(restoreResult.isPro).toBe(false);
    });

    it('gracefully reports failure if store restore query throws', async () => {
      (RNIap.getAvailablePurchases as jest.Mock).mockRejectedValue(
        new Error('Store connection timed out')
      );

      const restoreResult = await service.restorePurchases();

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.restoredCount).toBe(0);
      expect(restoreResult.error).toContain('Store connection timed out');
    });
  });

  describe('5. Listener Subscriptions & Teardown', () => {
    it('notifies subscribers immediately on subscription and on state changes', async () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);

      // First call happens immediately with initial state
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isPro: false })
      );

      // Trigger purchase update
      await service.handlePurchaseUpdate({
        productId: MINDRISE_SKUS.MONTHLY,
        transactionDate: Date.now(),
      } as any);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isPro: true,
          activePlan: MINDRISE_SKUS.MONTHLY,
        })
      );

      // Unsubscribe
      unsubscribe();
      listener.mockClear();

      // Trigger another change
      await service.resetEntitlementForTesting();
      expect(listener).not.toHaveBeenCalled();
    });

    it('cleans up native listeners on destroy', async () => {
      await service.initialize();
      await service.destroy();

      expect(RNIap.endConnection).toHaveBeenCalled();
    });
  });
});

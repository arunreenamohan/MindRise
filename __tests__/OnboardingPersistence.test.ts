import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasCompletedOnboarding,
  setOnboardingCompleted,
  resetOnboardingForTesting,
  ONBOARDING_STORAGE_KEY,
} from '../src/storage/onboardingStorage';

describe('Onboarding Persistence', () => {
  beforeEach(async () => {
    await resetOnboardingForTesting();
  });

  it('defaults to false for fresh/uninitialized storage', async () => {
    const isCompleted = await hasCompletedOnboarding();
    expect(isCompleted).toBe(false);
  });

  it('persists onboarding completion status to AsyncStorage', async () => {
    const success = await setOnboardingCompleted(true);
    expect(success).toBe(true);

    const storedRaw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    expect(storedRaw).toBe('true');

    const isCompleted = await hasCompletedOnboarding();
    expect(isCompleted).toBe(true);
  });

  it('supports updating onboarding status to false and resetting', async () => {
    await setOnboardingCompleted(true);
    expect(await hasCompletedOnboarding()).toBe(true);

    await setOnboardingCompleted(false);
    expect(await hasCompletedOnboarding()).toBe(false);

    await setOnboardingCompleted(true);
    await resetOnboardingForTesting();
    expect(await hasCompletedOnboarding()).toBe(false);
  });

  it('handles storage read errors gracefully without throwing', async () => {
    const originalGetItem = AsyncStorage.getItem;
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Disk read failure'));

    const result = await hasCompletedOnboarding();
    expect(result).toBe(false); // Graceful fallback

    AsyncStorage.getItem = originalGetItem;
  });

  it('handles storage write errors gracefully without throwing', async () => {
    const originalSetItem = AsyncStorage.setItem;
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Disk write failure'));

    const success = await setOnboardingCompleted(true);
    expect(success).toBe(false); // Returns false on error

    AsyncStorage.setItem = originalSetItem;
  });
});

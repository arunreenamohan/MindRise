/**
 * Onboarding State Persistence Module
 *
 * Implements persistent storage for onboarding completion status using AsyncStorage.
 * Handles storage read/write failures gracefully.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_STORAGE_KEY = '@mindrise_has_completed_onboarding_v1';

/**
 * Checks whether the user has previously completed onboarding.
 * Defaults to false if uninitialized, missing, or if storage read fails.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    return value === 'true';
  } catch {
    // Graceful fallback: return false on storage error so user is not stuck
    return false;
  }
}

/**
 * Persists the onboarding completion status.
 * Returns true if saved successfully, false on storage write failure.
 */
export async function setOnboardingCompleted(completed: boolean = true): Promise<boolean> {
  try {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, completed ? 'true' : 'false');
    return true;
  } catch {
    return false;
  }
}

/**
 * Resets onboarding status (primarily for unit tests and diagnostics).
 */
export async function resetOnboardingForTesting(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Ignore error in cleanup
  }
}

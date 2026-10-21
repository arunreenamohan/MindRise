import { en } from '../src/localization/en';
import { ml } from '../src/localization/ml';

describe('MindRise Localization (EN & ML)', () => {
  it('has consistent top-level namespaces in English and Malayalam', () => {
    const enKeys = Object.keys(en).sort();
    const mlKeys = Object.keys(ml).sort();
    expect(enKeys).toEqual(mlKeys);
  });

  it('provides all 4 bottom navigation tab labels in both languages', () => {
    expect(en.navigation.home).toBe('Home');
    expect(en.navigation.train).toBe('Train');
    expect(en.navigation.progress).toBe('Progress');
    expect(en.navigation.profile).toBe('Profile');

    expect(ml.navigation.home).toBe('ഹോം');
    expect(ml.navigation.train).toBe('പരിശീലനം');
    expect(ml.navigation.progress).toBe('പുരോഗതി');
    expect(ml.navigation.profile).toBe('പ്രൊഫൈൽ');
  });

  it('contains onboarding, home, and game introduction keys in Malayalam', () => {
    expect(ml.onboarding.heroTitle).toBeTruthy();
    expect(ml.home.startWorkoutCta).toBeTruthy();
    expect(ml.gameIntro.phase2ReadyNote).toBeTruthy();
  });

  it('provides all progress and history strings in English and Malayalam', () => {
    expect(en.progress.screenTitle).toBe('Cognitive Analytics');
    expect(ml.progress.screenTitle).toBeTruthy();

    expect(en.progress.recentActivityTitle).toBe('Recent Training Sessions');
    expect(ml.progress.recentActivityTitle).toBeTruthy();

    expect(en.progress.bestStreakLabel).toBe('Best Streak');
    expect(ml.progress.bestStreakLabel).toBeTruthy();

    expect(en.progress.days).toBe('days');
    expect(ml.progress.days).toBeTruthy();

    expect(en.progress.calibrated).toBe('Calibrated');
    expect(ml.progress.calibrated).toBeTruthy();

    expect(en.home.streakActiveDesc).toBeTruthy();
    expect(ml.home.streakActiveDesc).toBeTruthy();
  });
});

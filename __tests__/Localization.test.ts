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
});

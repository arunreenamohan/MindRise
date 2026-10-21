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

  it('provides complete Quick Reaction translations in English and Malayalam', () => {
    expect(en.quickReaction.gameTitle).toBe('Quick Reaction');
    expect(ml.quickReaction.gameTitle).toBe('ക്വിക്ക് റിയാക്ഷൻ');

    expect(en.quickReaction.waitPhase).toBe('Wait for Green...');
    expect(ml.quickReaction.waitPhase).toBeTruthy();

    expect(en.quickReaction.triggerPhase).toBe('TAP NOW!');
    expect(ml.quickReaction.triggerPhase).toBeTruthy();

    expect(en.quickReaction.falseStartFeedback).toBe('Too Early!');
    expect(ml.quickReaction.falseStartFeedback).toBeTruthy();

    expect(en.quickReaction.timeoutFeedback).toBe('Time Expired!');
    expect(ml.quickReaction.timeoutFeedback).toBeTruthy();

    expect(en.quickReaction.bestReactionLabel).toBe('Best Reaction');
    expect(ml.quickReaction.bestReactionLabel).toBeTruthy();

    const enQrKeys = Object.keys(en.quickReaction).sort();
    const mlQrKeys = Object.keys(ml.quickReaction).sort();
    expect(enQrKeys).toEqual(mlQrKeys);
  });

  it('provides complete Logic Quest translations in English and Malayalam', () => {
    expect(en.logicQuest.gameTitle).toBe('Logic Quest');
    expect(ml.logicQuest.gameTitle).toBe('ലോജിക് ക്വസ്റ്റ്');

    expect(en.logicQuest.categoryNumberSequence).toBe('Number Sequence');
    expect(ml.logicQuest.categoryNumberSequence).toBeTruthy();

    expect(en.logicQuest.categoryOddOneOut).toBe('Odd-One-Out');
    expect(ml.logicQuest.categoryOddOneOut).toBeTruthy();

    expect(en.logicQuest.categoryDeductive).toBe('Deductive Logic');
    expect(ml.logicQuest.categoryDeductive).toBeTruthy();

    expect(en.logicQuest.submitCta).toBe('Submit Answer');
    expect(ml.logicQuest.submitCta).toBeTruthy();

    expect(en.logicQuest.correctFeedback).toBe('Logical deduction correct!');
    expect(ml.logicQuest.correctFeedback).toBeTruthy();

    expect(en.logicQuest.incorrectFeedback).toBe('Not quite logical.');
    expect(ml.logicQuest.incorrectFeedback).toBeTruthy();

    expect(en.logicQuest.sessionCompleteTitle).toBe('Quest Concluded!');
    expect(ml.logicQuest.sessionCompleteTitle).toBeTruthy();

    const enLqKeys = Object.keys(en.logicQuest).sort();
    const mlLqKeys = Object.keys(ml.logicQuest).sort();
    expect(enLqKeys).toEqual(mlLqKeys);
  });
});

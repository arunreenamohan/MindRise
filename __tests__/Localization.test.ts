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

  it('provides complete Focus Finder translations in English and Malayalam', () => {
    expect(en.focusFinder.gameTitle).toBe('Focus Finder');
    expect(ml.focusFinder.gameTitle).toBe('ഫോക്കസ് ഫൈൻഡർ');

    expect(en.focusFinder.findPrompt).toBe('Find the target:');
    expect(ml.focusFinder.findPrompt).toBeTruthy();

    expect(en.focusFinder.hitFeedback).toBe('Target Identified!');
    expect(ml.focusFinder.hitFeedback).toBeTruthy();

    expect(en.focusFinder.missFeedback).toBe('Incorrect Target!');
    expect(ml.focusFinder.missFeedback).toBeTruthy();

    expect(en.focusFinder.sessionCompleteTitle).toBe('Session Complete!');
    expect(ml.focusFinder.sessionCompleteTitle).toBeTruthy();

    expect(en.focusFinder.shapeDiamond).toBe('Diamond');
    expect(ml.focusFinder.shapeDiamond).toBe('ഡയമണ്ട്');

    const enFfKeys = Object.keys(en.focusFinder).sort();
    const mlFfKeys = Object.keys(ml.focusFinder).sort();
    expect(enFfKeys).toEqual(mlFfKeys);
  });

  it('provides complete Pattern Master translations in English and Malayalam', () => {
    expect(en.patternMaster.gameTitle).toBe('Pattern Master');
    expect(ml.patternMaster.gameTitle).toBe('പാറ്റേൺ മാസ്റ്റർ');

    expect(en.patternMaster.selectPrompt).toBe('Select the matching rule candidate:');
    expect(ml.patternMaster.selectPrompt).toBeTruthy();

    expect(en.patternMaster.submitCta).toBe('Submit Answer');
    expect(ml.patternMaster.submitCta).toBeTruthy();

    expect(en.patternMaster.correctFeedback).toBe('Pattern rule deduced correctly!');
    expect(ml.patternMaster.correctFeedback).toBeTruthy();

    expect(en.patternMaster.incorrectFeedback).toBe('Not quite the matching pattern.');
    expect(ml.patternMaster.incorrectFeedback).toBeTruthy();

    expect(en.patternMaster.sessionCompleteTitle).toBe('Session Complete!');
    expect(ml.patternMaster.sessionCompleteTitle).toBeTruthy();

    expect(en.patternMaster.categoryVisualPattern).toBe('Shape Pattern');
    expect(ml.patternMaster.categoryVisualPattern).toBeTruthy();

    expect(en.patternMaster.categoryNumberSequence).toBe('Number Sequence');
    expect(ml.patternMaster.categoryNumberSequence).toBeTruthy();

    expect(en.patternMaster.categoryMissingTile).toBe('Missing Tile');
    expect(ml.patternMaster.categoryMissingTile).toBeTruthy();

    const enPmKeys = Object.keys(en.patternMaster).sort();
    const mlPmKeys = Object.keys(ml.patternMaster).sort();
    expect(enPmKeys).toEqual(mlPmKeys);
  });

  it('provides complete Daily Workout translations in English and Malayalam', () => {
    expect(en.dailyWorkout.screenTitle).toBe('Daily Workout');
    expect(ml.dailyWorkout.screenTitle).toBe('പ്രതിദിന പരിശീലനം');

    expect(en.dailyWorkout.completeTitle).toBe('Workout Complete!');
    expect(ml.dailyWorkout.completeTitle).toBe('പരിശീലനം പൂർത്തിയായി!');

    expect(en.dailyWorkout.startWorkoutCta).toBe('Start Daily Workout');
    expect(ml.dailyWorkout.startWorkoutCta).toBe('പരിശീലനം തുടങ്ങുക');

    expect(en.dailyWorkout.continueWorkoutCta).toBe('Continue Workout');
    expect(ml.dailyWorkout.continueWorkoutCta).toBe('പരിശീലനം തുടരുക');

    expect(en.dailyWorkout.totalTimeLabel).toBe('Total Time');
    expect(ml.dailyWorkout.totalTimeLabel).toBe('ആകെ സമയം');

    expect(en.dailyWorkout.averageAccuracyLabel).toBe('Average Accuracy');
    expect(ml.dailyWorkout.averageAccuracyLabel).toBe('ശരാശരി കൃത്യത');

    expect(en.dailyWorkout.breakdownTitle).toBe('Drill Performance Breakdown');
    expect(ml.dailyWorkout.breakdownTitle).toBe('വ്യായാമ പ്രകടന വിവരങ്ങൾ');

    const enDwKeys = Object.keys(en.dailyWorkout).sort();
    const mlDwKeys = Object.keys(ml.dailyWorkout).sort();
    expect(enDwKeys).toEqual(mlDwKeys);
  });

  it('provides complete Paywall translations in English and Malayalam', () => {
    expect(en.paywall.title).toBe('MindRise Pro');
    expect(ml.paywall.title).toBe('മൈൻഡ്‌റൈസ് പ്രോ');

    expect(en.paywall.upgradeCta).toBe('Upgrade to Pro');
    expect(ml.paywall.upgradeCta).toBe('പ്രോയിലേക്ക് അപ്ഗ്രേഡ് ചെയ്യുക');

    expect(en.paywall.restorePurchases).toBe('Restore Purchases');
    expect(ml.paywall.restorePurchases).toBe('വാങ്ങിയവ വീണ്ടെടുക്കുക');

    const enPwKeys = Object.keys(en.paywall).sort();
    const mlPwKeys = Object.keys(ml.paywall).sort();
    expect(enPwKeys).toEqual(mlPwKeys);
  });
});

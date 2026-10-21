export type SupportedLanguage = 'en' | 'ml';

export interface Translations {
  common: {
    appName: string;
    tagline: string;
    getStarted: string;
    start: string;
    back: string;
    cancel: string;
    confirm: string;
    comingSoon: string;
    ready: string;
    locked: string;
    inDevelopment: string;
    minutes: string;
    rounds: string;
    level: string;
    score: string;
    close: string;
    phase2Flagship: string;
  };
  navigation: {
    home: string;
    train: string;
    progress: string;
    profile: string;
  };
  onboarding: {
    heroTitle: string;
    heroSubtitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    ctaButton: string;
  };
  home: {
    greetingGuest: string;
    welcomeSubtitle: string;
    dailyWorkoutTitle: string;
    dailyWorkoutTag: string;
    dailyWorkoutDesc: string;
    startWorkoutCta: string;
    streakTitle: string;
    streakEmptyCount: string;
    streakEmptyDesc: string;
    quickTrainTitle: string;
    viewAllGames: string;
    mindQuote: string;
    mindQuoteAuthor: string;
  };
  train: {
    screenTitle: string;
    screenSubtitle: string;
    filterAll: string;
    filterMemory: string;
    filterAttention: string;
    filterSpeed: string;
    filterLogic: string;
    playDrill: string;
    previewDrill: string;
  };
  gameIntro: {
    instructionsTitle: string;
    cognitiveFocusTitle: string;
    sessionSpecsTitle: string;
    durationLabel: string;
    roundsLabel: string;
    difficultyLabel: string;
    statusNoticeTitle: string;
    notPlayableYet: string;
    phase2ReadyNote: string;
    startDrill: string;
    modalTitle: string;
    modalMessage: string;
  };
  progress: {
    screenTitle: string;
    screenSubtitle: string;
    mindIndexTitle: string;
    mindIndexEmpty: string;
    domainsTitle: string;
    emptyHistoryTitle: string;
    emptyHistoryMessage: string;
    startFirstWorkout: string;
    statWorkouts: string;
    statMinutes: string;
    statStreak: string;
  };
  profile: {
    screenTitle: string;
    guestName: string;
    guestSubtitle: string;
    localFirstBadge: string;
    languageSectionTitle: string;
    languageEnglish: string;
    languageMalayalam: string;
    appearanceSectionTitle: string;
    darkModeLabel: string;
    notificationsSectionTitle: string;
    dailyReminderLabel: string;
    dailyReminderDesc: string;
    privacySectionTitle: string;
    privacyDescription: string;
    appVersion: string;
  };
}

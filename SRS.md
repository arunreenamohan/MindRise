# Software Requirements Specification (SRS)
## Project: MindRise — Adaptive Cognitive Training Application
**Document Version:** 1.1.0 (Exhaustive System Specification)  
**Target Platform:** Mobile (Android & iOS via React Native)  
**Architecture:** Offline Local-First, Zero-Telemetry  
**Languages Supported:** English (`en`), Malayalam (`ml`)  
**Repository State:** Complete Core Implementation (Phases 1 through 10B)

---

## 1. Introduction & Executive Summary

### 1.1 Purpose
This document provides a comprehensive, mathematically precise Software Requirements Specification (SRS) for **MindRise**, an offline-first cognitive training mobile application. It captures all functional rules, game algorithms, scoring formulas, state machines, deterministic daily workout schedules, adaptive progression heuristics, data schemas, and non-functional requirements.

This document is engineered to serve as an authoritative reference for engineers and LLMs (such as Google Gemini) to generate new features, integrate monetization (in-app subscriptions), add sensory feedback (audio/haptics), or implement backend synchronization without ambiguity.

### 1.2 Product Vision & Core Tenets
1. **Local-First & Zero-Telemetry**: 100% of computation, game generation, history storage, and analytics execute on-device. No remote APIs, analytics SDKs, trackers, or user registrations are required.
2. **Bilingual Accessibility**: Full parity in English (`en`) and Malayalam (`ml`).
3. **Ergonomic Design System**: Deep Navy dark theme palette (`#0A0E1A` background, `#7C5CFC` primary accent, `#141B2D` cards) adhering to WCAG 2.1 AA touch and contrast standards.
4. **Conservative Adaptive Difficulty**: Adjusts starting levels by at most 1 step based on rolling 3-session performance windows, preventing sudden jumps or frustrating regression.
5. **Scientifically Honest Presentation**: Avoids pseudoscientific IQ or brain-age claims. Scores reflect in-app drill performance only.

---

## 2. System Architecture & Tech Stack

### 2.1 Technology Stack
- **Framework**: React Native `0.88.0` / React `19.3.0`
- **Language**: TypeScript `6.0.3` (Strict mode, zero `any` leakage in core engines)
- **Navigation**: React Navigation `v7` (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)
- **Persistence**: `@react-native-async-storage/async-storage` `^3.1.1`
- **Vector Graphics**: `react-native-svg` `^15.16.0` (all icons and charts rendered as pure SVG paths)
- **Safe Area**: `react-native-safe-area-context` `^5.5.2` (dynamic bottom bar inset calculation)
- **Test Harness**: Jest `^29.6.3` with `ts-jest` (21 test suites, 289 tests, 100% passing)

### 2.2 Navigation Hierarchy

```
RootNavigator (Native Stack)
├── OnboardingScreen (conditional initial route if @mindrise_onboarding_completed is false)
├── AppTabNavigator (MainTabs)
│   ├── HomeScreen ('Home' tab)
│   ├── TrainScreen ('Train' tab)
│   ├── ProgressScreen ('Progress' tab)
│   └── ProfileScreen ('Profile' tab)
├── DailyWorkoutScreen (modal/card stack route)
├── GameIntroScreen (card stack route with drill specs and starting level reset)
├── MemoryMatrixGameScreen (playable game route)
├── NumberRecallGameScreen (playable game route)
├── QuickReactionGameScreen (playable game route)
├── FocusFinderGameScreen (playable game route)
├── LogicQuestGameScreen (playable game route)
└── PatternMasterGameScreen (playable game route)
```

---

## 3. Comprehensive Game Specifications & Scoring Formulas

MindRise features 6 distinct cognitive games across 4 domains. Each game runs a standard **10-round session**.

### 3.1 Memory Matrix (`memory-matrix`)
- **Cognitive Domain**: Visuospatial Working Memory.
- **Round Lifecycle**:
  1. `memorize` phase (3,000ms): Target tiles illuminate in bright violet (`#7C5CFC`).
  2. `recall` phase: Tiles turn face down. User taps tiles to reproduce the pattern.
  3. `feedback` phase (800ms): Correct tiles turn green, incorrect taps show red warning.
  4. Round advances or strikes out (if 3 total errors occur in session).
- **Difficulty Curve (Levels 1 to 12)**:
  | Level | Grid Dimensions | Total Grid Tiles | Target Illuminated Tiles |
  |:---:|:---:|:---:|:---:|
  | 1 | 3 × 3 | 9 | 3 |
  | 2 | 3 × 3 | 9 | 4 |
  | 3 | 4 × 4 | 16 | 4 |
  | 4 | 4 × 4 | 16 | 5 |
  | 5 | 4 × 4 | 16 | 6 |
  | 6 | 5 × 5 | 25 | 6 |
  | 7 | 5 × 5 | 25 | 7 |
  | 8 | 5 × 5 | 25 | 8 |
  | 9 | 6 × 6 | 36 | 7 |
  | 10 | 6 × 6 | 36 | 8 |
  | 11 | 6 × 6 | 36 | 9 |
  | 12 | 6 × 6 | 36 | 10 |
- **Mathematical Scoring Formula**:
  $$\text{Base Points} = \text{correctCount} \times 100 \times \text{level}$$
  $$\text{Perfect Bonus} = (\text{mistakes} == 0 \text{ and } \text{correctCount} > 0) \ ? \ (250 \times \text{level}) : 0$$
  $$\text{Speed Bonus} = (\text{isPerfect and recallMs} < 6000) \ ? \ \left\lfloor\frac{6000 - \text{recallMs}}{100}\right\rfloor \times \text{level} : 0$$
  $$\text{Mistake Penalty} = \text{mistakesCount} \times 50 \times \text{level}$$
  $$\text{Streak Multiplier} = \begin{cases} 1.5 & \text{if consecutivePerfect} \ge 3 \\ 1.25 & \text{if consecutivePerfect} = 2 \\ 1.0 & \text{otherwise} \end{cases}$$
  $$\text{Round Score} = \max(0, \text{round}((\text{Base} + \text{Perfect} + \text{Speed} - \text{Penalty}) \times \text{Multiplier}))$$

---

### 3.2 Number Recall (`number-recall`)
- **Cognitive Domain**: Working Memory & Phonological Loop Capacity.
- **Round Lifecycle**:
  1. `presentation`: Sequence of numerical digits (0-9) flashes one by one (800ms visible, 200ms gap).
  2. `recall`: User enters numbers using custom accessible on-screen keypad.
  3. Supports both **Forward** and **Reverse** sequence modes.
- **Difficulty Curve (Levels 1 to 12)**:
  - Level 1: 4 digits, Forward.
  - Level 2: 4 digits, Reverse.
  - Level 3: 5 digits, Forward.
  - Level 4: 5 digits, Reverse.
  - Scales up to Level 12: 9 digits, Reverse.
- **Mathematical Scoring Formula**:
  - Full match:
    $$\text{Base Points} = \text{sequenceLength} \times 100 \times \text{level}$$
    $$\text{Perfect Bonus} = 250 \times \text{level}$$
    $$\text{Speed Bonus} = (\text{recallMs} < 8000) \ ? \ \left\lfloor\frac{8000 - \text{recallMs}}{100}\right\rfloor \times \text{level} : 0$$
  - Partial match:
    $$\text{Base Points} = \text{matchedDigitsCount} \times 25 \times \text{level}$$
    $$\text{Penalty} = (\text{sequenceLength} - \text{matchedDigitsCount}) \times 50 \times \text{level}$$
  - Streak Multiplier: $1.0\times$ (1), $1.25\times$ (2), $1.5\times$ (3+ consecutive correct).

---

### 3.3 Quick Reaction (`quick-reaction`)
- **Cognitive Domain**: Psychomotor Reaction Speed & Response Inhibition.
- **Round Lifecycle**:
  1. `waiting`: Screen displays "Wait for Green..." with randomized delay between **1,000ms and 3,000ms**.
  2. `trigger`: Screen turns bright emerald green (`#10B981`). Millisecond timer starts.
  3. `false_start`: Tapping before the green flash triggers an immediate false start penalty.
  4. `timeout`: Failure to tap within 2,000ms registers as a timeout (0 points).
- **Levels & Thresholds**:
  - Level 1: Target reaction $< 450\text{ms}$.
  - Level 6: Target reaction $< 250\text{ms}$.
- **Mathematical Scoring Formula**:
  $$\text{Raw Reaction Score} = \max\left(0, \text{round}\left(\frac{2000 - \text{reactionMs}}{10}\right) \times \text{level}\right)$$
  - Early Tap / False Start: Score = 0, logged as `falseStart`.
  - Fast Reaction Bonus: If $\text{reactionMs} < 250\text{ms}$, bonus $+150 \times \text{level}$.

---

### 3.4 Focus Finder (`focus-finder`)
- **Cognitive Domain**: Selective Visual Attention & Distractor Suppression.
- **Round Lifecycle**:
  1. Banner shows target: combination of **Shape** (Circle, Square, Triangle, Hexagon, Diamond, Star), **Color** (Violet, Emerald, Amber, Crimson, Cyan), and **Fill Pattern** (Solid, Outlined, Striped).
  2. Responsive grid of flanker distractors rendered. Distractors share 1 or 2 attributes with the target.
  3. Single unique target must be located and tapped before round countdown (10s) expires.
- **Difficulty Curve (Levels 1 to 6)**:
  - Level 1: 3 × 3 grid (9 items), low distractor similarity.
  - Level 6: 6 × 6 grid (36 items), high distractor similarity (flankers share 2 out of 3 attributes).
- **Mathematical Scoring Formula**:
  $$\text{Base} = 150 \times \text{level}$$
  $$\text{Time Bonus} = \max(0, \text{floor}((10000 - \text{findTimeMs}) / 50)) \times \text{level}$$
  $$\text{Incorrect Tap Penalty} = 75 \times \text{level}$$

---

### 3.5 Logic Quest (`logic-quest`)
- **Cognitive Domain**: Formal Deductive Logic & Semantic Reasoning.
- **Round Lifecycle**:
  1. Displays Premise 1, Premise 2, and a proposed Conclusion.
  2. User taps **TRUE** or **FALSE** within a 12-second countdown.
  3. Explanation card reveals the formal logical proof (e.g., Modus Ponens, Syllogistic Fallacy).
- **Difficulty Tiers (Tiers 1 to 3)**:
  - *Tier 1 (Easy)*: Direct relational transitivity (e.g., $A > B$, $B > C \implies A > C$).
  - *Tier 2 (Medium)*: Categorical syllogisms with negative quantifiers (e.g., *No mammals are cold-blooded; all whales are mammals*).
  - *Tier 3 (Hard)*: Contrapositives, conditional fallacies (affirming the consequent), counterfactuals.
- **Mathematical Scoring Formula**:
  $$\text{Base Points} = \begin{cases} 100 & \text{Tier 1} \\ 150 & \text{Tier 2} \\ 200 & \text{Tier 3} \end{cases}$$
  $$\text{Speed Bonus} = (\text{isCorrect and timeMs} < 12000) \ ? \ \left\lfloor\frac{12000 - \text{timeMs}}{100}\right\rfloor : 0$$

---

### 3.6 Pattern Master (`pattern-master`)
- **Cognitive Domain**: Abstract Relational Reasoning & Inductive Logic.
- **Round Lifecycle**:
  1. Displays progressive sequence or 3×3 matrix puzzle with 1 missing cell.
  2. 4 candidate choices presented. User selects the answer within 15 seconds.
- **Puzzle Categories**:
  - *Rotational*: $45^\circ$, $90^\circ$, $180^\circ$ clockwise/counter-clockwise progressions.
  - *Geometric Polygon*: Vertex increments ($N+1$ sides, dual-ring nesting).
  - *Numerical Series*: Fibonacci, quadratic increments, alternating offsets.
  - *Matrix XOR / Overlap*: Attribute intersection across rows and columns.
- **Difficulty Tiers (Tiers 1 to 3)**:
  - Tier 1: Single visual attribute change.
  - Tier 2: Dual attribute progressions (color + orientation).
  - Tier 3: Complex matrix relational operations.
- **Mathematical Scoring Formula**:
  $$\text{Base Points} = \text{Tier} \times 100 + \max\left(0, \left\lfloor\frac{15000 - \text{solveTimeMs}}{100}\right\rfloor\right)$$

---

## 4. Daily Workout Coordinator Engine (Phase 9)

### 4.1 Deterministic Selection Formula
Daily workouts are generated deterministically based on the device's local calendar date string (`YYYY-MM-DD`). No network request is required.

- **Epoch Baseline**: `WORKOUT_EPOCH_DATE = '2026-01-01'`.
- **Combination Index Formula**:
  $$\text{dayOffset} = \text{getDaysDifference}(\text{'2026-01-01'}, \text{dateKey})$$
  $$\text{index} = ((\text{dayOffset} \bmod 8) + 8) \bmod 8$$

### 4.2 The 8-Day Balanced Regimen Matrix
Guarantees **50% appearance** for every game and **no category duplication** in any workout:

```
Day 0: Memory Matrix (Memory)       • Focus Finder (Attention)   • Logic Quest (Logic)
Day 1: Number Recall (Memory)       • Quick Reaction (Speed)     • Pattern Master (Reasoning)
Day 2: Memory Matrix (Memory)       • Quick Reaction (Speed)     • Logic Quest (Logic)
Day 3: Number Recall (Memory)       • Focus Finder (Attention)   • Pattern Master (Reasoning)
Day 4: Memory Matrix (Memory)       • Focus Finder (Attention)   • Pattern Master (Reasoning)
Day 5: Number Recall (Memory)       • Quick Reaction (Speed)     • Logic Quest (Logic)
Day 6: Memory Matrix (Memory)       • Quick Reaction (Speed)     • Pattern Master (Reasoning)
Day 7: Number Recall (Memory)       • Focus Finder (Attention)   • Logic Quest (Logic)
```

### 4.3 Workout State Machine
- `not_started`: Workout generated; drill 0 pending.
- `in_progress`: Drills 1 or 2 completed; user can leave app and resume later today.
- `completed`: All 3 drills finished. Computes daily average score and commits streak milestone.

---

## 5. Adaptive Starting Difficulty Engine (Phase 10B)

MindRise personalizes the starting level of each game so experienced players skip low levels while struggling players receive gentle pacing.

### 5.1 Starting Difficulty Bounds

```typescript
export const STARTING_DIFFICULTY_BOUNDS: Record<GameId, GameDifficultyBounds> = {
  'memory-matrix': { minStartingLevel: 1, maxStartingLevel: 8, defaultStartingLevel: 1, isTierBased: false },
  'number-recall': { minStartingLevel: 1, maxStartingLevel: 7, defaultStartingLevel: 1, isTierBased: false },
  'quick-reaction': { minStartingLevel: 1, maxStartingLevel: 4, defaultStartingLevel: 1, isTierBased: false },
  'focus-finder':   { minStartingLevel: 1, maxStartingLevel: 4, defaultStartingLevel: 1, isTierBased: false },
  'logic-quest':    { minStartingLevel: 1, maxStartingLevel: 3, defaultStartingLevel: 1, isTierBased: true },
  'pattern-master': { minStartingLevel: 1, maxStartingLevel: 3, defaultStartingLevel: 1, isTierBased: true },
};
```

### 5.2 Session Eligibility Criteria
A session record is eligible for evaluation **only if**:
1. `outcome !== 'abandoned'`.
2. Valid numbers: `finalScore >= 0`, `0 <= accuracyPercentage <= 100`.
3. Duration sanity check: $\text{durationMs} \ge (\text{roundsCompleted} \times 400\text{ms})$.
4. Strike-out validation: If `outcome === 'game-over'`, must be Memory Matrix or Number Recall and have $\ge 3$ rounds played.

### 5.3 Promotion & Demotion Rules Matrix (3-Session Window)

| Game | Promotion Condition (+1 Step) | Demotion Condition (-1 Step) |
|---|---|---|
| **Memory Matrix** | All 3 completed, avg accuracy $\ge 85\%$, each session $\ge 6$ perfect rounds, each climbed $\ge 2$ levels above start. | Avg accuracy $< 60\%$ OR $\ge 2$ sessions struck out before round 7. |
| **Number Recall** | All 3 completed, avg accuracy $\ge 85\%$, max digit span in each $\ge \text{start} + 3$. | Avg accuracy $< 60\%$ OR $\ge 2$ sessions struck out with span $\le \text{start} + 1$. |
| **Quick Reaction** | All 3 completed, accuracy $\ge 80\%$, median RT in each between $100\text{ms}$ and $320\text{ms}$, false starts $\le 1$. | Avg accuracy $< 60\%$ OR median RT $> 480\text{ms}$ in $\ge 2$ sessions OR $(\text{falseStarts} + \text{timeouts}) \ge 4$. |
| **Focus Finder** | All 3 completed, accuracy $\ge 80\%$, avg find time $< 3,500\text{ms}$, climbed $\ge 1$ level above start. | Avg accuracy $< 60\%$ OR avg find time $> 6,500\text{ms}$ in $\ge 2$ sessions OR misses + timeouts $\ge 4$. |
| **Logic Quest** | All 3 completed, avg accuracy $\ge 80\%$, avg response time $\le 10,000\text{ms}$. | Avg accuracy $\le 50\%$. |
| **Pattern Master** | All 3 completed, avg accuracy $\ge 80\%$, avg response time $\le 12,000\text{ms}$. | Avg accuracy $\le 50\%$. |

---

## 6. Progress Analytics & Streak Logic

### 6.1 Streak Calculation & Timezone Policy
- Stored as calendar date strings (`YYYY-MM-DD`).
- **UTC Arithmetic**: Day differences calculated via `Date.UTC` to eliminate Daylight Saving Time (DST) 23h/25h distortions.
- **Timezone Boundary Tolerance**:
  - Global timezones span UTC-12 to UTC+14 (max 26h skew).
  - Date difference $\text{diff} = \text{getDaysDifference}(\text{recordDate}, \text{todayKey})$.
  - $\text{diff} = -1$ is accepted (allows trans-pacific flights where user trains in Tokyo and lands in Honolulu).
  - $\text{diff} < -1$ ($\ge 2$ days in future) is rejected as corrupted device clock.
- **Streak Continuity**: Active streak preserved if user completed a session **today** OR **yesterday**. Lapses if $\text{diff} > 1$.

### 6.2 Drill Performance Index
$$\text{Performance Index} = \begin{cases} \text{round}\left(\frac{\sum \text{finalScore}}{\text{totalCompletedSessions}}\right) & \text{if totalCompletedSessions} > 0 \\ \text{null (Uncalibrated)} & \text{otherwise} \end{cases}$$
*Disclaimer: Displayed as an in-app training index. The app explicitly disclaims clinical or IQ equivalency.*

---

## 7. Data Models & Storage Schema

```typescript
// Core Session Record
export interface GameSessionRecord {
  id: string;               // UUID / timestamp-based unique key
  gameId: GameId;           // 'memory-matrix' | 'number-recall' | etc.
  dateKey: string;          // 'YYYY-MM-DD'
  timestamp: number;        // Epoch ms
  durationMs: number;       // Elapsed active play ms
  finalScore: number;       // Total points awarded
  accuracyPercentage: number; // 0 - 100
  highestLevel: number;     // Highest level reached within session
  startingLevel: number;    // Level at which this session began
  totalRounds: number;      // Target rounds (default 10)
  roundsCompleted: number;  // Number of rounds finished
  outcome: 'completed' | 'game-over' | 'abandoned';
  workoutMode: boolean;     // Whether played inside Daily Workout
  gameSpecificMetrics?: {
    perfectRounds?: number;
    maxDigitSpan?: number;
    medianReactionMs?: number;
    avgReactionMs?: number;
    falseStarts?: number;
    timeouts?: number;
    avgFindTimeMs?: number;
    misses?: number;
    avgResponseTimeMs?: number;
  };
}

// Daily Workout Entity
export interface DailyWorkoutRecord {
  id: string;               // 'workout_YYYY-MM-DD'
  schemaVersion: number;    // 1
  dateKey: string;          // 'YYYY-MM-DD'
  status: 'not-started' | 'in-progress' | 'completed';
  drills: WorkoutDrill[];
  currentDrillIndex: number;// 0, 1, or 2
  totalDurationMs: number;
  averageAccuracy: number;
  completedAt?: string;     // ISO timestamp
}

// Adaptive Profile Entity
export interface GameDifficultyProfile {
  gameId: GameId;
  startingLevel: number;
  lastUpdated: number;
  evaluatedSessionIds: string[]; // Bounded to last 50 session IDs to prevent AsyncStorage bloating
}
```

---

## 8. Verification & Quality Gates

The codebase contains **21 Jest test suites with 289 automated tests**:

| Test Suite File | Coverage Scope |
|---|---|
| `AdaptiveDifficultyEngine.test.ts` | 3-session evaluation rules, promotions, demotions, boundaries for all 6 games |
| `AdaptiveDifficultyIntegration.test.ts` | AsyncStorage lifecycle, recovery replay, manual reset without history loss |
| `DifficultyRepository.test.ts` | Idempotent duplicate processing, 50-session sliding window |
| `DailyWorkoutFlow.test.ts` | Complete 3-drill daily workout sequence & summary generation |
| `DailyWorkoutRepository.test.ts` | Daily workout persistence, resume from drill 1/2 |
| `DailyWorkoutSelector.test.ts` | Deterministic 8-day modulo rotation, category exclusivity |
| `DashboardAggregator.test.ts` | 7-day activity matrix, category separation, metric calculations |
| `HistoryRepository.test.ts` | Streak calculation, leap years, timezone drift, corrupt date rejection |
| `Localization.test.ts` | English and Malayalam key parity, missing key detection |
| `MemoryMatrixEngine.test.ts` | Grid generation, tile illuminate timers, strike-outs |
| `NumberRecallEngine.test.ts` | Forward/reverse sequences, digit span scaling, keypad entry |
| `QuickReactionEngine.test.ts` | False start triggers, reaction delay bounds (1-3s), millisecond precision |
| `FocusFinderEngine.test.ts` | Geometric distractor generation, flanker similarity |
| `LogicQuestEngine.test.ts` | Syllogism validity, 3 difficulty tiers, countdown timer |
| `PatternMasterEngine.test.ts` | Sequence & matrix rule deduction, 4-option selection |
| `ProgressScreen.test.tsx` | Dashboard render, sparkline rendering, empty state handling |
| `GameRegistry.test.ts` | Metadata validation, flagships, categories |
| `Navigation.test.ts` | Route param contracts, bottom tabs configuration |
| `OnboardingPersistence.test.ts` | First-launch flag handling |
| `Theme.test.ts` | Color tokens, dark/light contrast ratios |
| `App.test.tsx` | Root component mount & provider hierarchy |

---

## 9. Future Roadmap & Prompting Instructions for Gemini

### 9.1 Recommended Expansion Modules
1. **In-App Subscriptions (`react-native-purchases`)**:
   - Monthly, Annual, and Lifetime Pro tiers.
   - Entitlements: Unlimited training, full longitudinal score exports, customizable daily workouts.
2. **Audio & Haptic Feedback**:
   - Tactile feedback on key taps (`expo-haptics` or `react-native-haptic-feedback`).
   - Clean audio chimes on perfect rounds and workout completion (`react-native-sound`).
3. **Local Push Notifications**:
   - Customizable daily reminders (e.g., "Time for your 8-minute daily workout!").

### 9.2 Master Prompt Template for Gemini
When prompting Gemini or other coding assistants to add features, use this syntax:

```text
You are pair programming on MindRise, a React Native 0.88 + TypeScript cognitive training app.
Reference the MindRise SRS v1.1.0 specification.
Adhere strictly to:
1. Deep Navy theme tokens (#0A0E1A, #141B2D, #7C5CFC).
2. Pure deterministic engines with strict TypeScript interfaces.
3. Offline local-first persistence via AsyncStorage.
4. Comprehensive Jest unit test coverage.

Task: [SPECIFY YOUR FEATURE, E.G. "Implement RevenueCat In-App Purchases with a Paywall Screen"]
```

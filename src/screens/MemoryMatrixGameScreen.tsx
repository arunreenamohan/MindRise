import React, { useReducer, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatBadge } from '../components/StatBadge';
import {
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  HeartIcon,
  SparklesIcon,
  CheckCircleIcon,
  XIcon,
  BrainIcon,
  ZapIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import {
  createInitialGameState,
  matrixReducer,
  generatePattern,
  getLevelConfig,
  TileStatus,
} from '../games/memory-matrix';

export const MemoryMatrixGameScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, typography, radius } = useTheme();
  const { t } = useLocalization();
  const { width } = useWindowDimensions();

  const [state, dispatch] = useReducer(matrixReducer, undefined, () =>
    createInitialGameState(1)
  );

  const [countdown, setCountdown] = useState<number>(3);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // 1. Initial Countdown Handling
  useEffect(() => {
    if (state.phase === 'countdown') {
      setCountdown(3);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            // Transition into round 1 preview
            const config = getLevelConfig(state.currentLevel);
            const pattern = generatePattern({
              totalCells: config.gridSize * config.gridSize,
              targetCount: config.targetCount,
            });
            dispatch({
              type: 'START_PREVIEW',
              targetIndices: pattern,
              previewDurationMs: config.previewDurationMs,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 800);
    }
    return () => clearTimers();
  }, [state.phase, state.currentLevel, clearTimers]);

  // 2. Preview Phase Timer Handling
  useEffect(() => {
    if (state.phase === 'preview') {
      clearTimers();
      // If targets haven't been generated yet for this round, generate them
      if (state.targetIndices.length === 0) {
        const config = getLevelConfig(state.currentLevel);
        const pattern = generatePattern({
          totalCells: config.gridSize * config.gridSize,
          targetCount: config.targetCount,
        });
        dispatch({
          type: 'START_PREVIEW',
          targetIndices: pattern,
          previewDurationMs: config.previewDurationMs,
        });
        return;
      }

      timerRef.current = setTimeout(() => {
        dispatch({ type: 'START_RECALL' });
      }, state.previewDurationMs);
    }
    return () => clearTimers();
  }, [state.phase, state.previewDurationMs, state.targetIndices.length, state.currentLevel, clearTimers]);

  // 3. Round Feedback Phase Timer Handling
  useEffect(() => {
    if (state.phase === 'round-feedback') {
      clearTimers();
      timerRef.current = setTimeout(() => {
        dispatch({ type: 'END_ROUND_FEEDBACK' });
      }, 1300);
    }
    return () => clearTimers();
  }, [state.phase, clearTimers]);

  // 4. AppState / Background Interruption Safety
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'background' || nextState === 'inactive') {
          clearTimers();
          dispatch({ type: 'PAUSE_GAME' });
        }
      }
    );
    return () => {
      subscription.remove();
      clearTimers();
    };
  }, [clearTimers]);

  // Unmount Cleanup
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Tile Interaction
  const handleTilePress = (tileIndex: number) => {
    if (state.phase !== 'recall') return;
    dispatch({ type: 'TAP_TILE', tileIndex });
  };

  const handlePause = () => {
    clearTimers();
    dispatch({ type: 'PAUSE_GAME' });
  };

  const handleResume = () => {
    dispatch({ type: 'RESUME_GAME' });
  };

  const handleRestart = () => {
    clearTimers();
    dispatch({ type: 'RESTART_GAME' });
  };

  const handleQuitConfirm = () => {
    clearTimers();
    setShowExitConfirm(false);
    navigation.goBack();
  };

  const handleBackPress = () => {
    if (state.phase === 'completed' || state.phase === 'game-over') {
      navigation.goBack();
      return;
    }
    clearTimers();
    dispatch({ type: 'PAUSE_GAME' });
    setShowExitConfirm(true);
  };

  // Responsive Grid Geometry
  const gridMetrics = useMemo(() => {
    const boardPadding = 16;
    const boardSize = Math.min(width - 40, 380);
    const gap = state.gridSize <= 4 ? 10 : 8;
    const totalGaps = (state.gridSize - 1) * gap;
    const tileSize = Math.floor((boardSize - boardPadding * 2 - totalGaps) / state.gridSize);
    return { boardSize, gap, tileSize };
  }, [width, state.gridSize]);

  // Determine visual tile state
  const getTileStatus = (index: number): TileStatus => {
    if (state.phase === 'preview') {
      return state.targetIndices.includes(index) ? 'preview-target' : 'neutral';
    }

    if (state.phase === 'recall') {
      if (state.selectedIndices.includes(index)) return 'correct';
      if (state.mistakeIndices.includes(index)) return 'incorrect';
      return 'neutral';
    }

    if (state.phase === 'round-feedback') {
      if (state.selectedIndices.includes(index)) return 'correct';
      if (state.mistakeIndices.includes(index)) return 'incorrect';
      if (state.targetIndices.includes(index)) return 'missed';
      return 'neutral';
    }

    return 'neutral';
  };

  // Render Result Screen
  if (state.phase === 'completed' || state.phase === 'game-over') {
    const isSuccess = state.phase === 'completed';
    const stats = state.sessionStats;

    return (
      <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
        <View style={styles.resultsHero}>
          <View
            style={[
              styles.resultsBadgeCircle,
              {
                backgroundColor: isSuccess ? `${colors.primaryLight}22` : `${colors.warning}22`,
                borderColor: isSuccess ? colors.primaryLight : colors.warning,
              },
            ]}
          >
            <BrainIcon size={52} color={isSuccess ? colors.primaryLight : colors.warning} />
          </View>

          <StatBadge
            label={isSuccess ? 'SESSION COMPLETED' : 'SESSION CONCLUDED'}
            variant={isSuccess ? 'primary' : 'warning'}
            icon={<SparklesIcon size={12} color={isSuccess ? colors.primaryLight : colors.warning} />}
            style={styles.resultsStatusBadge}
          />

          <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 8 }]}>
            {isSuccess ? t.memoryMatrix.sessionCompleteTitle : t.memoryMatrix.gameOverTitle}
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
            {isSuccess
              ? 'Outstanding focus! You successfully traversed all 10 rounds of the spatial matrix.'
              : 'You pushed your memory buffer to its current limit. Review your metrics below.'}
          </Text>
        </View>

        {/* Big Score Card */}
        <Card variant="highlighted" style={styles.scoreSummaryCard}>
          <Text style={[typography.caption, { color: colors.primaryLight }]}>
            {t.memoryMatrix.finalScoreLabel.toUpperCase()}
          </Text>
          <Text style={[typography.statNumber, { color: colors.textPrimary, marginTop: 6 }]}>
            {stats?.finalScore.toLocaleString() ?? state.score.toLocaleString()}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
            Calibrated Visuospatial Score Points
          </Text>
        </Card>

        {/* 4-Stat Metrics Grid */}
        <View style={styles.metricsGrid}>
          <Card variant="elevated" style={styles.metricCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.memoryMatrix.accuracyLabel}
            </Text>
            <Text style={[typography.h2, { color: colors.attention, marginTop: 6 }]}>
              {stats?.accuracyPercentage ?? 0}%
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.memoryMatrix.highestLevelLabel}
            </Text>
            <Text style={[typography.h2, { color: colors.primaryLight, marginTop: 6 }]}>
              Level {stats?.highestLevel ?? state.highestLevel}
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.memoryMatrix.perfectRoundsLabel}
            </Text>
            <Text style={[typography.h2, { color: colors.success, marginTop: 6 }]}>
              {stats?.perfectRounds ?? 0} / {stats?.roundsCompleted ?? 0}
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Rounds Played
            </Text>
            <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 6 }]}>
              {stats?.roundsCompleted ?? 0} / {state.totalRounds}
            </Text>
          </Card>
        </View>

        {/* Actions */}
        <View style={styles.resultsActions}>
          <Button
            title={t.memoryMatrix.playAgainCta}
            onPress={handleRestart}
            variant="primary"
            size="lg"
            icon={<RotateCcwIcon size={18} color="#FFFFFF" />}
          />
          <Button
            title={t.memoryMatrix.finishCta}
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="md"
            style={styles.finishBtn}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Active Game View
  const totalCells = state.gridSize * state.gridSize;
  const isPerfectFeedback = state.phase === 'round-feedback' && state.mistakeIndices.length === 0;

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBackPress}
          activeOpacity={0.7}
          style={[styles.circleBtn, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
        >
          <ArrowLeftIcon size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.pillsRow}>
          <StatBadge
            label={`${t.memoryMatrix.roundCounter.toUpperCase()} ${state.currentRound}/${state.totalRounds}`}
            variant="neutral"
            size="sm"
          />
          <StatBadge
            label={`${t.memoryMatrix.levelLabel.toUpperCase()} ${state.currentLevel}`}
            variant="primary"
            size="sm"
          />
        </View>

        <TouchableOpacity
          onPress={handlePause}
          activeOpacity={0.7}
          style={[styles.circleBtn, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
        >
          <PauseIcon size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Lives / Strikes and Score Header */}
      <View style={styles.statsBar}>
        <View style={styles.livesRow}>
          {[1, 2, 3].map((strikeNum) => {
            const isRemaining = strikeNum <= state.strikesRemaining;
            return (
              <View key={strikeNum} style={styles.heartWrapper}>
                <HeartIcon
                  size={20}
                  color={isRemaining ? colors.speed : colors.borderLight}
                  filled={isRemaining}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.scoreRow}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.memoryMatrix.scoreLabel.toUpperCase()}:
          </Text>
          <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 6 }]}>
            {state.score}
          </Text>
          {state.consecutivePerfectRounds >= 2 && (
            <StatBadge
              label={`${state.consecutivePerfectRounds}x STREAK`}
              variant="accent"
              size="sm"
              style={styles.streakBadge}
            />
          )}
        </View>
      </View>

      {/* Phase Banner */}
      <Card
        variant={state.phase === 'preview' ? 'highlighted' : 'elevated'}
        style={styles.instructionBanner}
      >
        {state.phase === 'countdown' && (
          <View style={styles.bannerContent}>
            <Text style={[typography.h2, { color: colors.primaryLight, textAlign: 'center' }]}>
              {countdown > 0 ? countdown : 'START!'}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              Get ready to memorize the illuminated pattern!
            </Text>
          </View>
        )}

        {state.phase === 'preview' && (
          <View style={styles.bannerContent}>
            <View style={styles.bannerTitleRow}>
              <SparklesIcon size={18} color={colors.primaryLight} />
              <Text style={[typography.label, { color: colors.primaryLight, marginLeft: 6 }]}>
                {t.memoryMatrix.memorizePhase}
              </Text>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              Memorize {state.targetIndices.length} highlighted tiles
            </Text>
          </View>
        )}

        {state.phase === 'recall' && (
          <View style={styles.bannerContent}>
            <View style={styles.bannerTitleRow}>
              <ZapIcon size={18} color={colors.warning} />
              <Text style={[typography.label, { color: colors.textPrimary, marginLeft: 6 }]}>
                {t.memoryMatrix.recallPhase}
              </Text>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              {state.selectedIndices.length} of {state.targetIndices.length} targets found
            </Text>
          </View>
        )}

        {state.phase === 'round-feedback' && (
          <View style={styles.bannerContent}>
            <Text
              style={[
                typography.label,
                { color: isPerfectFeedback ? colors.success : colors.speed, textAlign: 'center' },
              ]}
            >
              {isPerfectFeedback ? t.memoryMatrix.perfectRound : t.memoryMatrix.roundFailed}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              {isPerfectFeedback ? `+${state.roundScore} points earned!` : 'Revealing missed pattern tiles...'}
            </Text>
          </View>
        )}
      </Card>

      {/* The Matrix Grid */}
      <View style={styles.boardWrapper}>
        <View
          style={[
            styles.board,
            {
              width: gridMetrics.boardSize,
              height: gridMetrics.boardSize,
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const status = getTileStatus(index);
            const isClickable = state.phase === 'recall';

            let tileBg = colors.card;
            let tileBorder = colors.border;
            let tileIcon = null;

            if (status === 'preview-target') {
              tileBg = colors.primary;
              tileBorder = colors.primaryLight;
              tileIcon = <View style={styles.targetDot} />;
            } else if (status === 'correct') {
              tileBg = colors.primary;
              tileBorder = colors.primaryLight;
              tileIcon = <CheckCircleIcon size={18} color="#FFFFFF" />;
            } else if (status === 'incorrect') {
              tileBg = colors.error;
              tileBorder = '#DC2626';
              tileIcon = <XIcon size={18} color="#FFFFFF" />;
            } else if (status === 'missed') {
              tileBg = `${colors.primaryLight}33`;
              tileBorder = colors.primaryLight;
              tileIcon = <View style={[styles.targetDot, { backgroundColor: colors.primaryLight }]} />;
            }

            return (
              <Pressable
                key={index}
                disabled={!isClickable}
                onPress={() => handleTilePress(index)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    width: gridMetrics.tileSize,
                    height: gridMetrics.tileSize,
                    backgroundColor: tileBg,
                    borderColor: tileBorder,
                    borderRadius: radius.md,
                    opacity: pressed && isClickable ? 0.75 : 1,
                  },
                  status === 'missed' && styles.missedTileDashed,
                ]}
              >
                {tileIcon}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Pause Modal */}
      <Modal visible={state.phase === 'paused'} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.pauseCard}>
            <View style={[styles.pauseIconCircle, { backgroundColor: colors.primaryMuted }]}>
              <PauseIcon size={32} color={colors.primaryLight} />
            </View>
            <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
              {t.memoryMatrix.pausedTitle}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
              Current Session: Round {state.currentRound} of {state.totalRounds} • Score: {state.score}
            </Text>

            <View style={styles.pauseActions}>
              <Button
                title={t.memoryMatrix.resumeCta}
                onPress={handleResume}
                variant="primary"
                size="md"
                icon={<PlayIcon size={18} color="#FFFFFF" />}
              />
              <Button
                title={t.memoryMatrix.restartCta}
                onPress={handleRestart}
                variant="secondary"
                size="md"
                icon={<RotateCcwIcon size={18} color={colors.textPrimary} />}
              />
              <Button
                title={t.memoryMatrix.quitCta}
                onPress={() => setShowExitConfirm(true)}
                variant="ghost"
                size="md"
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Quit Confirmation Modal */}
      <Modal visible={showExitConfirm} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.quitCard}>
            <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
              {t.memoryMatrix.quitConfirmTitle}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }]}>
              {t.memoryMatrix.quitConfirmMessage}
            </Text>

            <View style={styles.quitActions}>
              <Button
                title="Keep Playing"
                onPress={() => {
                  setShowExitConfirm(false);
                  if (state.phase === 'paused') {
                    handleResume();
                  }
                }}
                variant="primary"
                size="md"
              />
              <Button
                title="Exit Session"
                onPress={handleQuitConfirm}
                variant="danger"
                size="md"
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartWrapper: {
    marginRight: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadge: {
    marginLeft: 8,
  },
  instructionBanner: {
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  bannerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tile: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  missedTileDashed: {
    borderStyle: 'dashed',
  },
  resultsHero: {
    alignItems: 'center',
    textAlign: 'center',
    marginVertical: 16,
  },
  resultsBadgeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  resultsStatusBadge: {
    marginBottom: 8,
  },
  scoreSummaryCard: {
    padding: 20,
    alignItems: 'center',
    marginVertical: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    alignItems: 'center',
  },
  resultsActions: {
    marginTop: 24,
    gap: 12,
  },
  finishBtn: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pauseCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  pauseIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pauseActions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  quitCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  quitActions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
});

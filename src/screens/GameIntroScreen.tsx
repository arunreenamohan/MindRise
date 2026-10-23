import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatBadge } from '../components/StatBadge';
import {
  GridIcon,
  LayersIcon,
  TargetIcon,
  CpuIcon,
  ZapIcon,
  BrainIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../components/SvgIcons';
import { getGameById } from '../games/registry';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import {
  difficultyRepository,
  GameDifficultyProfile,
  STARTING_DIFFICULTY_BOUNDS,
} from '../difficulty';

type GameIntroRouteProp = RouteProp<RootStackParamList, 'GameIntro'>;

export const GameIntroScreen: React.FC = () => {
  const route = useRoute<GameIntroRouteProp>();
  const navigation = useNavigation();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  const [modalVisible, setModalVisible] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [difficultyProfile, setDifficultyProfile] = useState<GameDifficultyProfile | null>(null);

  const gameId = route.params?.gameId;
  const game = (gameId ? getGameById(gameId) : undefined) || getGameById('memory-matrix')!;
  const isPlayable =
    game.id === 'memory-matrix' ||
    game.id === 'number-recall' ||
    game.id === 'quick-reaction' ||
    game.id === 'logic-quest' ||
    game.id === 'focus-finder' ||
    game.id === 'pattern-master';
  const accentColor = colors[game.accentColorKey] || colors.primary;

  const isTierBased = STARTING_DIFFICULTY_BOUNDS[game.id]?.isTierBased ?? false;
  const currentLevel = difficultyProfile?.startingLevel ?? STARTING_DIFFICULTY_BOUNDS[game.id]?.defaultStartingLevel ?? 1;

  useEffect(() => {
    let isMounted = true;
    difficultyRepository.getStartingDifficulty(game.id).then((p) => {
      if (isMounted) {
        setDifficultyProfile(p);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [game.id]);

  const handleConfirmReset = async () => {
    setShowResetModal(false);
    try {
      const reset = await difficultyRepository.resetDifficulty(game.id);
      setDifficultyProfile(reset);
    } catch {
      // Graceful fallback
    }
  };

  const getGameIcon = (id: string, color: string) => {
    switch (id) {
      case 'memory-matrix':
        return <GridIcon size={34} color={color} />;
      case 'number-recall':
        return <LayersIcon size={34} color={color} />;
      case 'focus-finder':
        return <TargetIcon size={34} color={color} />;
      case 'pattern-master':
        return <CpuIcon size={34} color={color} />;
      case 'quick-reaction':
        return <ZapIcon size={34} color={color} />;
      case 'logic-quest':
      default:
        return <BrainIcon size={34} color={color} />;
    }
  };

  const handleStartSession = () => {
    const screenMap: Record<string, keyof RootStackParamList> = {
      'memory-matrix': 'MemoryMatrixGame',
      'number-recall': 'NumberRecallGame',
      'quick-reaction': 'QuickReactionGame',
      'logic-quest': 'LogicQuestGame',
      'focus-finder': 'FocusFinderGame',
      'pattern-master': 'PatternMasterGame',
    };

    const targetScreen = screenMap[game.id];
    if (targetScreen) {
      const targetParams = {
        workoutMode: route.params?.workoutMode,
        drillIndex: route.params?.drillIndex,
        initialLevel: currentLevel,
      };

      if (route.params?.workoutMode && typeof (navigation as any).replace === 'function') {
        (navigation as any).replace(targetScreen, targetParams);
      } else {
        (navigation as any).navigate(targetScreen, targetParams);
      }
    } else {
      setModalVisible(true);
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title={game.defaultName}
        onBack={() => navigation.goBack()}
        rightElement={
          <StatBadge
            label={isPlayable ? t.common.ready : t.common.comingSoon}
            variant={isPlayable ? 'success' : 'locked'}
          />
        }
      />

      {/* Hero Icon & Title Card */}
      <Card variant="highlighted" style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={[styles.largeIconWrapper, { backgroundColor: `${accentColor}22` }]}>
            {getGameIcon(game.id, accentColor)}
          </View>
          <View style={styles.heroDetails}>
            <StatBadge label={game.categoryLabel.toUpperCase()} variant="primary" size="sm" />
            <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 4 }]}>
              {game.defaultName}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 2 }]}>
              {game.shortDescription}
            </Text>
          </View>
        </View>
      </Card>

      {/* Session Specifications */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.gameIntro.sessionSpecsTitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.specsCard}>
        <View style={styles.specsGrid}>
          <View style={styles.specItem}>
            <ClockIcon size={20} color={colors.primaryLight} />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
              {t.gameIntro.durationLabel}
            </Text>
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 2 }]}>
              {game.specs.estimatedDurationMins} {t.common.minutes}
            </Text>
          </View>

          <View style={[styles.specItem, styles.specBorder, { borderColor: colors.border }]}>
            <SparklesIcon size={20} color={colors.attention} />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
              {t.gameIntro.roundsLabel}
            </Text>
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 2 }]}>
              {game.specs.totalRounds}
            </Text>
          </View>

          <View style={styles.specItem}>
            <ZapIcon size={20} color={colors.warning} />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
              {isTierBased ? t.gameIntro.startingTierLabel : t.gameIntro.startingLevelLabel}
            </Text>
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 2 }]}>
              {isTierBased ? `${t.dailyWorkout.tierBadge} ${currentLevel}` : `${t.dailyWorkout.levelBadge} ${currentLevel}`}
            </Text>
          </View>
        </View>
      </Card>

      {/* Adaptive Progression Context & Reset Option */}
      <Card variant="outlined" style={styles.adaptiveCard}>
        <View style={styles.adaptiveRow}>
          <BrainIcon size={20} color={colors.primaryLight} />
          <Text style={[typography.bodySmall, styles.adaptiveText, { color: colors.textSecondary }]}>
            {t.gameIntro.adaptiveNote}
          </Text>
        </View>
        <Button
          title={t.gameIntro.resetDifficultyCta}
          onPress={() => setShowResetModal(true)}
          variant="ghost"
          size="sm"
          style={styles.resetDifficultyBtn}
        />
      </Card>

      {/* Step by Step Instructions */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.gameIntro.instructionsTitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.instructionCard}>
        {game.detailedInstructions.map((instruction, idx) => (
          <View key={idx} style={styles.instructionRow}>
            <View style={[styles.stepNumberBadge, { backgroundColor: colors.backgroundHigher, borderColor: colors.border }]}>
              <Text style={[typography.label, { color: colors.primaryLight }]}>{idx + 1}</Text>
            </View>
            <Text style={[typography.bodyMedium, styles.instructionText, { color: colors.textSecondary }]}>
              {instruction}
            </Text>
          </View>
        ))}
      </Card>

      {/* Cognitive Benefits */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.gameIntro.cognitiveFocusTitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.benefitsCard}>
        {game.cognitiveBenefits.map((benefit, idx) => (
          <View key={idx} style={styles.benefitRow}>
            <CheckCircleIcon size={18} color="#10B981" />
            <Text style={[typography.bodyMedium, styles.benefitText, { color: colors.textPrimary }]}>
              {benefit}
            </Text>
          </View>
        ))}
      </Card>

      {/* Roadmap Notice */}
      <Card
        variant="outlined"
        style={[
          styles.noticeCard,
          {
            backgroundColor: isPlayable ? 'rgba(124, 92, 252, 0.08)' : 'rgba(100, 116, 139, 0.08)',
            borderColor: isPlayable ? colors.primaryLight : colors.border,
          },
        ]}
      >
        <View style={styles.noticeRow}>
          <ShieldCheckIcon size={22} color={isPlayable ? colors.primaryLight : colors.textMuted} />
          <View style={styles.noticeContent}>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              {t.gameIntro.statusNoticeTitle}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
              {isPlayable ? t.gameIntro.phase2ReadyNote : t.gameIntro.notPlayableYet}
            </Text>
          </View>
        </View>
      </Card>

      {/* Start Button */}
      <View style={styles.bottomCta}>
        <Button
          title={t.gameIntro.startDrill}
          onPress={handleStartSession}
          variant="primary"
          size="lg"
          icon={<ZapIcon size={18} color="#FFFFFF" />}
        />
      </View>

      {/* Milestone Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalContent}>
            <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(100, 116, 139, 0.18)' }]}>
              <BrainIcon size={38} color={colors.textSecondary} />
            </View>

            <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
              {game.defaultName}
            </Text>

            <StatBadge
              label="IN ACTIVE DEVELOPMENT"
              variant="locked"
              style={styles.modalBadge}
            />

            <Text style={[typography.bodyMedium, styles.modalBody, { color: colors.textSecondary }]}>
              {t.gameIntro.modalMessage}
            </Text>

            <Button
              title={t.common.close}
              onPress={() => setModalVisible(false)}
              variant="secondary"
              size="md"
              style={styles.modalCloseBtn}
            />
          </Card>
        </View>
      </Modal>

      {/* Reset Starting Level Modal */}
      <Modal
        visible={showResetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalContent}>
            <View style={[styles.modalIconCircle, { backgroundColor: `${colors.attention}22` }]}>
              <ZapIcon size={38} color={colors.attention} />
            </View>

            <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
              {t.gameIntro.resetDifficultyTitle}
            </Text>

            <Text style={[typography.bodyMedium, styles.modalBody, { color: colors.textSecondary }]}>
              {t.gameIntro.resetDifficultyMessage}
            </Text>

            <Button
              title={t.gameIntro.resetDifficultyConfirm}
              onPress={handleConfirmReset}
              variant="primary"
              size="md"
              style={styles.modalActionBtn}
            />
            <Button
              title={t.common.cancel}
              onPress={() => setShowResetModal(false)}
              variant="secondary"
              size="md"
              style={styles.modalActionBtn}
            />
          </Card>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  heroCard: {
    marginBottom: 20,
    padding: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  heroDetails: {
    flex: 1,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  specsCard: {
    padding: 16,
  },
  specsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
  },
  specBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  adaptiveCard: {
    marginTop: 14,
    padding: 14,
  },
  adaptiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  adaptiveText: {
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  resetDifficultyBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  instructionCard: {
    padding: 18,
    gap: 14,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  instructionText: {
    flex: 1,
    lineHeight: 22,
  },
  benefitsCard: {
    padding: 18,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    marginLeft: 10,
    flex: 1,
  },
  noticeCard: {
    marginTop: 20,
    padding: 16,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeContent: {
    marginLeft: 12,
    flex: 1,
  },
  bottomCta: {
    marginTop: 26,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalBadge: {
    marginVertical: 10,
  },
  modalBody: {
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 14,
  },
  modalActionBtn: {
    width: '100%',
    marginTop: 8,
  },
  modalCloseBtn: {
    width: '100%',
    marginTop: 8,
  },
});

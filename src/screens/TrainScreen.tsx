import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { StatBadge } from '../components/StatBadge';
import {
  GridIcon,
  LayersIcon,
  TargetIcon,
  CpuIcon,
  ZapIcon,
  BrainIcon,
  ChevronRightIcon,
  ClockIcon,
} from '../components/SvgIcons';
import { GAMES_LIST } from '../games/registry';
import { GameDefinition } from '../games/types';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';

type TrainScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Train'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type FilterCategory = 'all' | 'memory' | 'attention' | 'speed' | 'logic';

export const TrainScreen: React.FC = () => {
  const navigation = useNavigation<TrainScreenNavigationProp>();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const filteredGames = GAMES_LIST.filter((game) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'memory') return game.category === 'memory';
    if (activeFilter === 'attention') return game.category === 'attention';
    if (activeFilter === 'speed') return game.category === 'speed';
    if (activeFilter === 'logic') return game.category === 'logic' || game.category === 'problemSolving';
    return true;
  });

  const getGameIcon = (id: string, color: string) => {
    switch (id) {
      case 'memory-matrix':
        return <GridIcon size={26} color={color} />;
      case 'number-recall':
        return <LayersIcon size={26} color={color} />;
      case 'focus-finder':
        return <TargetIcon size={26} color={color} />;
      case 'pattern-master':
        return <CpuIcon size={26} color={color} />;
      case 'quick-reaction':
        return <ZapIcon size={26} color={color} />;
      case 'logic-quest':
      default:
        return <BrainIcon size={26} color={color} />;
    }
  };

  const handleSelectGame = (game: GameDefinition) => {
    navigation.navigate('GameIntro', { gameId: game.id });
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title={t.train.screenTitle}
        subtitle={t.train.screenSubtitle}
      />

      {/* Category Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'memory', 'attention', 'speed', 'logic'] as FilterCategory[]).map((cat) => {
            const isSelected = activeFilter === cat;
            const labelMap: Record<FilterCategory, string> = {
              all: t.train.filterAll,
              memory: t.train.filterMemory,
              attention: t.train.filterAttention,
              speed: t.train.filterSpeed,
              logic: t.train.filterLogic,
            };

            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveFilter(cat)}
                activeOpacity={0.7}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.backgroundElevated,
                    borderColor: isSelected ? colors.primaryLight : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.label,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {labelMap[cat]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 6 Game Entries */}
      <View style={styles.gamesList}>
        {filteredGames.map((game) => {
          const accentColor = colors[game.accentColorKey] || colors.primary;
          const isPlayable = game.status === 'ready-phase2' || game.status === 'ready-phase3';

          return (
            <Card
              key={game.id}
              variant="elevated"
              onPress={() => handleSelectGame(game)}
              style={styles.gameCard}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.iconContainer, { backgroundColor: `${accentColor}1F` }]}>
                  {getGameIcon(game.id, accentColor)}
                </View>

                <View style={styles.titleArea}>
                  <View style={styles.badgeRow}>
                    <StatBadge
                      label={game.categoryLabel.toUpperCase()}
                      variant={isPlayable ? 'primary' : 'neutral'}
                      size="sm"
                    />
                    <StatBadge
                      label={isPlayable ? t.common.ready : t.common.comingSoon}
                      variant={isPlayable ? 'success' : 'locked'}
                      size="sm"
                      style={styles.statusBadge}
                    />
                  </View>

                  <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 4 }]}>
                    {game.defaultName}
                  </Text>
                </View>
              </View>

              <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 8 }]}>
                {game.shortDescription}
              </Text>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View style={styles.specMeta}>
                  <ClockIcon size={14} color={colors.textMuted} />
                  <Text style={[typography.bodySmall, { color: colors.textMuted, marginLeft: 4 }]}>
                    {game.specs.estimatedDurationMins} {t.common.minutes} • {game.specs.totalRounds} {t.common.rounds}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <Text style={[typography.label, { color: isPlayable ? colors.primaryLight : colors.textSecondary }]}>
                    {isPlayable ? t.train.playDrill : t.train.previewDrill}
                  </Text>
                  <ChevronRightIcon size={16} color={isPlayable ? colors.primaryLight : colors.textSecondary} />
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 36,
  },
  filterContainer: {
    marginVertical: 14,
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  gamesList: {
    gap: 16,
    marginTop: 4,
  },
  gameCard: {
    padding: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  titleArea: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  specMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});

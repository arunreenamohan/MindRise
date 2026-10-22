import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import { WeeklyActivityDay } from '../history/dashboardAggregator';

export interface WeeklyActivityMatrixProps {
  days: WeeklyActivityDay[];
}

export const WeeklyActivityMatrix: React.FC<WeeklyActivityMatrixProps> = ({ days }) => {
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  return (
    <View style={styles.container}>
      <View style={styles.daysRow}>
        {days.map((day) => {
          let statusText = t.progress.restDayBadge;
          if (day.hasCompletedWorkout) {
            statusText = t.progress.workoutDoneBadge;
          } else if (day.sessionsCount > 0) {
            statusText = `${day.sessionsCount} ${t.progress.drillsOnlyBadge}`;
          }

          const dayA11yLabel = `${day.dayLabel}, ${day.dateNum}: ${statusText}${day.isToday ? ` (${t.progress.todayLabel})` : ''}`;

          return (
            <View
              key={day.dateKey}
              style={[
                styles.dayColumn,
                day.isToday && [styles.todayColumn, { borderColor: colors.primaryLight, backgroundColor: colors.backgroundSecondary }],
              ]}
              accessible={true}
              accessibilityLabel={dayA11yLabel}
            >
              <Text
                style={[
                  typography.caption,
                  styles.dayLabel,
                  { color: day.isToday ? colors.primaryLight : colors.textMuted },
                ]}
              >
                {day.dayLabel}
              </Text>

              <View style={styles.iconWrapper}>
                {day.hasCompletedWorkout ? (
                  // Completed full daily workout (check icon in green)
                  <Svg width={28} height={28} viewBox="0 0 28 28">
                    <Circle cx="14" cy="14" r="12" fill="rgba(16, 185, 129, 0.16)" stroke="#10B981" strokeWidth="2" />
                    <Path
                      d="M9 14.5l3.5 3.5 6.5-7"
                      stroke="#10B981"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                ) : day.sessionsCount > 0 ? (
                  // Individual drill practice
                  <Svg width={28} height={28} viewBox="0 0 28 28">
                    <Circle
                      cx="14"
                      cy="14"
                      r="12"
                      fill="rgba(124, 92, 252, 0.14)"
                      stroke={colors.primaryLight}
                      strokeWidth="1.8"
                    />
                    <Circle cx="14" cy="14" r="4.5" fill={colors.primaryLight} />
                  </Svg>
                ) : (
                  // Rest day
                  <Svg width={28} height={28} viewBox="0 0 28 28">
                    <Circle cx="14" cy="14" r="4" fill={colors.borderLight} />
                  </Svg>
                )}
              </View>

              <Text
                style={[
                  typography.caption,
                  styles.dateNum,
                  day.isToday && styles.todayDateNum,
                  {
                    color: day.isToday
                      ? colors.textPrimary
                      : day.hasCompletedWorkout || day.sessionsCount > 0
                      ? colors.textSecondary
                      : colors.textMuted,
                  },
                ]}
              >
                {day.dateNum}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend Row */}
      <View style={[styles.legendRow, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.workoutLegendDot]} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {t.progress.workoutDoneBadge}
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primaryLight }]} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {t.progress.drillsOnlyBadge}
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.borderLight }]} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.progress.restDayBadge}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  todayColumn: {
    borderWidth: 1,
  },
  dayLabel: {
    fontWeight: '700',
    marginBottom: 6,
    fontSize: 11,
  },
  iconWrapper: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dateNum: {
    fontSize: 11,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  workoutLegendDot: {
    backgroundColor: '#10B981',
  },
  todayDateNum: {
    fontWeight: '700',
  },
});

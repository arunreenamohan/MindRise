import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export interface ScoreTrendSparklineProps {
  scores: number[];
  color?: string;
  width?: number;
  height?: number;
  emptyLabel?: string;
}

export const ScoreTrendSparkline: React.FC<ScoreTrendSparklineProps> = ({
  scores,
  color,
  width = 110,
  height = 32,
  emptyLabel = 'Play 2+ sessions for trend',
}) => {
  const { colors, typography } = useTheme();
  const strokeColor = color || colors.primaryLight;

  if (!scores || scores.length < 2) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[typography.caption, styles.emptyText, { color: colors.textMuted }]}>
          {emptyLabel}
        </Text>
      </View>
    );
  }

  const paddingX = 6;
  const paddingY = 6;
  const availableWidth = width - paddingX * 2;
  const availableHeight = height - paddingY * 2;

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore > 0 ? maxScore - minScore : 1;

  const points = scores.map((score, index) => {
    const x = paddingX + (index / (scores.length - 1)) * availableWidth;
    const y = height - paddingY - ((score - minScore) / range) * availableHeight;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

  const accessibleLabel = `Score history: ${scores.join(', ')}`;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={accessibleLabel}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Subtle baseline */}
        <Line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="2, 2"
        />
        {/* Sparkline track */}
        <Polyline
          points={pointsString}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {points.map((p, idx) => (
          <Circle
            key={`pt_${idx}`}
            cx={p.x}
            cy={p.y}
            r={idx === points.length - 1 ? 3 : 2}
            fill={idx === points.length - 1 ? strokeColor : colors.background}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});

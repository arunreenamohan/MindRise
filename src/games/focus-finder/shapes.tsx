import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { FocusFinderShape, FocusFinderColorKey, FocusFinderInnerPattern } from './types';
import { FOCUS_FINDER_COLOR_HEX_MAP } from './focusFinderEngine';

export interface FocusFinderShapeViewProps {
  shape: FocusFinderShape;
  colorKey: FocusFinderColorKey;
  pattern: FocusFinderInnerPattern;
  size?: number;
  contrastBg?: string;
}

export const FocusFinderShapeView: React.FC<FocusFinderShapeViewProps> = ({
  shape,
  colorKey,
  pattern,
  size = 36,
  contrastBg = '#0B0F19',
}) => {
  const fillColor = FOCUS_FINDER_COLOR_HEX_MAP[colorKey] || '#00D4B2';

  const renderShapeBody = () => {
    switch (shape) {
      case 'circle':
        return <Circle cx="16" cy="16" r="13" fill={fillColor} />;
      case 'square':
        return <Rect x="4" y="4" width="24" height="24" rx="5" fill={fillColor} />;
      case 'triangle':
        return <Path d="M16 3.5 L28.5 27 L3.5 27 Z" fill={fillColor} stroke={fillColor} strokeWidth="1" strokeLinejoin="round" />;
      case 'diamond':
        return <Path d="M16 2.5 L29.5 16 L16 29.5 L2.5 16 Z" fill={fillColor} stroke={fillColor} strokeWidth="1" strokeLinejoin="round" />;
      case 'star':
        return (
          <Path
            d="M16 2.5 L19.8 11.2 L29.5 12.1 L22.2 18.5 L24.4 28 L16 23 L7.6 28 L9.8 18.5 L2.5 12.1 L12.2 11.2 Z"
            fill={fillColor}
            stroke={fillColor}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        );
      case 'hexagon':
        return (
          <Path
            d="M16 2.5 L27.5 9.2 L27.5 22.8 L16 29.5 L4.5 22.8 L4.5 9.2 Z"
            fill={fillColor}
            stroke={fillColor}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        );
      default:
        return <Circle cx="16" cy="16" r="13" fill={fillColor} />;
    }
  };

  const renderPattern = () => {
    switch (pattern) {
      case 'ring':
        return <Circle cx="16" cy="16" r="5.5" fill={contrastBg} />;
      case 'dot':
        return <Circle cx="16" cy="16" r="3.5" fill={contrastBg} />;
      case 'cross':
        return (
          <>
            <Line
              x1="11"
              y1="11"
              x2="21"
              y2="21"
              stroke={contrastBg}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <Line
              x1="21"
              y1="11"
              x2="11"
              y2="21"
              stroke={contrastBg}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </>
        );
      case 'solid':
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {renderShapeBody()}
        {renderPattern()}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

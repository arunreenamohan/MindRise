import React from 'react';
import Svg, { Path, Rect, Circle, Polyline, Line } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const BrainIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const HomeIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DumbbellIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="m6.5 6.5 11 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="m21 21-1-1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="m3 3 1 1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="m18 22 4-4-2-2-4 4 2 2z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m2 6 4-4 2 2-4 4-2-2z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m14 10 4-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="m10 14-4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const ChartIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ZapIcon: React.FC<IconProps> = ({ size = 24, color = '#FFB800', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const FlameIcon: React.FC<IconProps> = ({ size = 24, color = '#FF5376', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const GridIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
    <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

export const TargetIcon: React.FC<IconProps> = ({ size = 24, color = '#00D4B2', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth={strokeWidth} fill={color} />
  </Svg>
);

export const LayersIcon: React.FC<IconProps> = ({ size = 24, color = '#F59E0B', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="12 2 2 7 12 12 22 7 12 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="2 17 12 22 22 17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="2 12 12 17 22 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CpuIcon: React.FC<IconProps> = ({ size = 24, color = '#3B82F6', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth={strokeWidth} />
    <Rect x="9" y="9" width="6" height="6" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="9" y1="1" x2="9" y2="4" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="15" y1="1" x2="15" y2="4" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="9" y1="20" x2="9" y2="23" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="15" y1="20" x2="15" y2="23" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="20" y1="9" x2="23" y2="9" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="20" y1="14" x2="23" y2="14" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="1" y1="9" x2="4" y2="9" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="1" y1="14" x2="4" y2="14" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="5 3 19 12 5 21 5 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="19" y1="12" x2="5" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="12 19 5 12 12 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="12 5 19 12 12 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 24, color = '#94A3B8', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="9 18 15 12 9 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 24, color = '#10B981', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline points="9 12 11 14 15 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const GlobeIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const MoonIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BellIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 24, color = '#94A3B8', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
    <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ size = 24, color = '#10B981', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22 4 12 14.01 9 11.01" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SparklesIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PauseIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="6" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth={strokeWidth} />
    <Rect x="14" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

export const RotateCcwIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 3v5h5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const XIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const HeartIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 24,
  color = '#FF5376',
  strokeWidth = 2,
  filled = false,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path
      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const DeleteIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="18" y1="9" x2="12" y2="15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="18" y2="15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 20, color = '#10B981', strokeWidth = 2.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CrownIcon: React.FC<IconProps> = ({ size = 24, color = '#7C5CFC', strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);



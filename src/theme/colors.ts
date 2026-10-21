export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundElevated: string;
  backgroundHigher: string;
  backgroundSecondary: string;
  card: string;
  cardHover: string;
  border: string;
  borderLight: string;

  // Accents & Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  accentViolet: string;
  accentVioletGlow: string;

  // Domain Colors
  memory: string;
  speed: string;
  attention: string;
  logic: string;
  problemSolving: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Tabs & Controls
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  badgeBg: string;
  badgeText: string;
}

export const darkColors: ThemeColors = {
  // Deep navy / indigo foundation
  background: '#0B0F19',
  backgroundElevated: '#121929',
  backgroundHigher: '#1B243B',
  backgroundSecondary: '#151D30',
  card: '#141D33',
  cardHover: '#1D2845',
  border: '#23304E',
  borderLight: '#304169',

  // Restrained vibrant violet accents
  primary: '#7C5CFC',
  primaryLight: '#9B82FD',
  primaryDark: '#5D3DE6',
  primaryMuted: 'rgba(124, 92, 252, 0.16)',
  accentViolet: '#8A67FF',
  accentVioletGlow: 'rgba(138, 103, 255, 0.35)',

  // Domain colors
  memory: '#7C5CFC',       // Violet
  speed: '#FF5376',        // Electric Coral
  attention: '#00D4B2',    // Radiant Cyan/Teal
  logic: '#3B82F6',        // Bright Blue
  problemSolving: '#F59E0B', // Warm Amber

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0F19',

  // Tabs
  tabBarBackground: '#0D1322',
  tabBarBorder: '#1F2A44',
  tabBarActive: '#8A67FF',
  tabBarInactive: '#64748B',
  badgeBg: 'rgba(124, 92, 252, 0.20)',
  badgeText: '#A78BFA',
};

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  backgroundElevated: '#FFFFFF',
  backgroundHigher: '#F1F5F9',
  backgroundSecondary: '#EDE9FE',
  card: '#FFFFFF',
  cardHover: '#F8FAFC',
  border: '#E2E8F0',
  borderLight: '#CBD5E1',

  primary: '#6344E7',
  primaryLight: '#7C5CFC',
  primaryDark: '#4C28D0',
  primaryMuted: 'rgba(99, 68, 231, 0.12)',
  accentViolet: '#6D28D9',
  accentVioletGlow: 'rgba(109, 40, 217, 0.2)',

  memory: '#6344E7',
  speed: '#E11D48',
  attention: '#0D9488',
  logic: '#2563EB',
  problemSolving: '#D97706',

  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#6344E7',
  tabBarInactive: '#94A3B8',
  badgeBg: 'rgba(99, 68, 231, 0.12)',
  badgeText: '#6344E7',
};

/**
 * MealChat Design System — Theme Tokens
 * 
 * Light mode primary, dark mode ready.
 * CSS variables in index.css handle web styling;
 * these tokens are for React Native StyleSheet and JS logic.
 */

// ─── Color Palette ───

export const themeColors = {
  light: {
    // Core surfaces
    background: '#F5F7FA',
    primary: '#23A455',
    primaryPressed: '#1E8E49',
    primaryLight: 'rgba(35, 164, 85, 0.10)',
    primaryGlow: 'rgba(35, 164, 85, 0.25)',
    secondary: '#00A3FF',
    secondaryLight: 'rgba(0, 163, 255, 0.10)',
    accent: '#FF7A00',
    accentHover: '#E56E00',
    accentLight: 'rgba(255, 122, 0, 0.10)',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0F2F5',
    surfaceDarker: '#E5E7EB',
    surfaceElevated: '#FFFFFF',

    // Text
    text: '#1A1D26',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    textLink: '#00A3FF',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F0F2F5',
    borderFocus: '#23A455',

    // Form
    input: '#F0F2F5',
    inputFocused: '#FFFFFF',

    // Semantic
    danger: '#EF4444',
    dangerLight: 'rgba(239, 68, 68, 0.08)',
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.08)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.08)',
    info: '#3B82F6',
    infoLight: 'rgba(59, 130, 246, 0.08)',

    // Card
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    avatarBg: '#E5E7EB',
    modalOverlay: 'rgba(0, 0, 0, 0.4)',
    badgeBg: 'rgba(35, 164, 85, 0.08)',

    // Status (UI design)
    menuNeeded: '#FF8C42',
    menuComplete: '#2FD89F',
    scheduleInProgress: '#5B9BD5',
    confirmed: '#9B59B6',
    settlement: '#A855F7',
    unreadBadge: '#EF4444',

    // Brand Partners
    baemin: '#2AC1BC',
    baeminLight: 'rgba(42, 193, 188, 0.10)',
    kakao: '#FEE500',
    kakaoText: '#191919',

    // Glass
    glassBg: 'rgba(255, 255, 255, 0.72)',
    glassBgHeavy: 'rgba(255, 255, 255, 0.88)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
  },

  dark: {
    background: '#0B0F19',
    primary: '#27AE60',
    primaryPressed: '#2ecc71',
    primaryLight: 'rgba(39, 174, 96, 0.15)',
    primaryGlow: 'rgba(39, 174, 96, 0.30)',
    secondary: '#4DB8FF',
    secondaryLight: 'rgba(77, 184, 255, 0.12)',
    accent: '#FF9A33',
    accentHover: '#FF8C1A',
    accentLight: 'rgba(255, 154, 51, 0.12)',
    surface: '#151B2B',
    surfaceSecondary: '#1E2740',
    surfaceDarker: '#0B0F19',
    surfaceElevated: '#1E2740',

    text: '#F0F4F8',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textTertiary: '#64748B',
    textInverse: '#0B0F19',
    textLink: '#4DB8FF',

    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.04)',
    borderFocus: '#27AE60',

    input: 'rgba(255, 255, 255, 0.05)',
    inputFocused: 'rgba(255, 255, 255, 0.08)',

    danger: '#EF4444',
    dangerLight: 'rgba(239, 68, 68, 0.12)',
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.12)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.12)',
    info: '#3B82F6',
    infoLight: 'rgba(59, 130, 246, 0.12)',

    card: 'rgba(255, 255, 255, 0.03)',
    cardBorder: 'rgba(255, 255, 255, 0.06)',
    avatarBg: 'rgba(255, 255, 255, 0.06)',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    badgeBg: 'rgba(255, 255, 255, 0.05)',

    menuNeeded: '#FF9A4D',
    menuComplete: '#5FE3D8',
    scheduleInProgress: '#6BA5E8',
    confirmed: '#B984E0',
    settlement: '#C084FC',
    unreadBadge: '#FF4444',

    baemin: '#3DD4CF',
    baeminLight: 'rgba(61, 212, 207, 0.12)',
    kakao: '#FEE500',
    kakaoText: '#191919',

    glassBg: 'rgba(21, 27, 43, 0.75)',
    glassBgHeavy: 'rgba(21, 27, 43, 0.9)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
  }
};

// ─── Active Theme ───
// Default to light mode. Context will switch dynamically later.
export const THEME = themeColors.light;
export type ThemeType = typeof themeColors.light;


// ─── Gradients ───

export const GRADIENTS = {
  // Status gradients
  menuNeeded: 'linear-gradient(135deg, #FF8C42, #FF6B35)',
  menuComplete: 'linear-gradient(135deg, #2FD89F, #4ECDC4)',
  schedule: 'linear-gradient(135deg, #5B9BD5, #3B82F6)',
  confirmed: 'linear-gradient(135deg, #9B59B6, #8B5CF6)',
  settlement: 'linear-gradient(135deg, #A855F7, #7C3AED)',

  // Brand gradients
  primaryButton: 'linear-gradient(135deg, #23A455, #1E8E49)',
  orangeButton: 'linear-gradient(135deg, #FF7A00, #E56E00)',
  blueButton: 'linear-gradient(135deg, #00A3FF, #0088DD)',

  // Background gradients
  heroGreen: 'linear-gradient(135deg, #23A455 0%, #00A3FF 100%)',
  heroBrand: 'linear-gradient(135deg, #23A455 0%, #1E8E49 50%, #00A3FF 100%)',
  warmSurface: 'linear-gradient(180deg, #F5F7FA 0%, #FFFFFF 100%)',
} as const;


// ─── Shadows ───

export const SHADOWS = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm: '0 2px 8px rgba(0, 0, 0, 0.06)',
  md: '0 4px 16px rgba(0, 0, 0, 0.08)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.10)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.12)',
  glowGreen: '0 4px 20px rgba(35, 164, 85, 0.25)',
  glowOrange: '0 4px 20px rgba(255, 122, 0, 0.25)',
  glowBlue: '0 4px 20px rgba(0, 163, 255, 0.20)',
  cardHover: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
} as const;


// ─── Typography ───

export const TYPOGRAPHY = {
  headingXL: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  headingL: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  headingM: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: '400' as const, letterSpacing: 0 },
  bodyBold: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0 },
  micro: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.5 },
} as const;


// ─── Spacing ───

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;


// ─── Border Radius ───

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;


// ─── Animation ───

export const ANIMATION = {
  durationFast: 150,
  durationNormal: 250,
  durationSlow: 400,
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;


// ─── Palette Colors (for avatars, room colors, etc.) ───

export const PALETTE_COLORS = [
  '#23A455', // Green
  '#00A3FF', // Blue
  '#10b981', // Emerald
  '#FFD600', // Yellow
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#FF7A00', // Orange
  '#14B8A6', // Teal
];


// ─── Status Helpers ───

export const STATUS_CONFIG = {
  menuNeeded: {
    color: themeColors.light.menuNeeded,
    gradient: GRADIENTS.menuNeeded,
    label: '메뉴 투표 필요',
    labelShort: '투표 필요',
  },
  menuComplete: {
    color: themeColors.light.menuComplete,
    gradient: GRADIENTS.menuComplete,
    label: '메뉴 선정 완료',
    labelShort: '선정 완료',
  },
  scheduleInProgress: {
    color: themeColors.light.scheduleInProgress,
    gradient: GRADIENTS.schedule,
    label: '일정 조율 중',
    labelShort: '조율 중',
  },
  confirmed: {
    color: themeColors.light.confirmed,
    gradient: GRADIENTS.confirmed,
    label: '약속 확정됨',
    labelShort: '확정됨',
  },
  settlement: {
    color: themeColors.light.settlement,
    gradient: GRADIENTS.settlement,
    label: '정산 진행 중',
    labelShort: '정산 중',
  },
} as const;

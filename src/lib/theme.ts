export const themeColors = {
  light: {
    background: '#E6E6E6', // Figma redesign background
    primary: '#FF9900', // MealChat Orange (Figma redesign)
    primaryPressed: '#E68A00',
    accentGradientStart: '#F66F3E', // Figma Accent button gradient
    accentGradientEnd: '#F6C53E',
    secondary: '#00A3FF', // MealChat Sky Blue
    accent: '#FF7A00', // MealChat Orange (legacy accent, kept for existing screens)
    surface: '#F3F3F3', // Figma redesign surface
    surfaceDarker: '#E5E7EB',
    text: '#000000', // Figma redesign text
    textMuted: '#9C9C9C', // Figma redesign muted text
    textTertiary: '#B4B2A8', // Figma redesign tertiary text
    textSecondary: '#737373', // Figma 홈 본문 보조 텍스트
    accentSoft: '#FF8C3B', // Figma 홈 배지 / 링크 강조 오렌지
    accentSoftBorder: '#FFD9B8', // Figma PayNudge 카드 테두리
    border: '#E6E6E6', // Figma redesign border
    input: '#FFFFFF',
    danger: '#F53942', // Figma redesign danger
    success: '#27AE60',
    warning: '#FFD600', // MealChat Yellow
    card: '#FFFFFF',
    cardBorder: '#E6E6E6', // Figma redesign card border
    avatarBg: '#E5E7EB',
    modalOverlay: 'rgba(51, 51, 51, 0.4)',
    badgeBg: '#F7EFE6', // Figma redesign icon tint background
    // UI 설계 색상
    menuNeeded: '#FF8C42',
    menuComplete: '#4ECDC4',
    scheduleInProgress: '#5B9BD5',
    confirmed: '#9B59B6',
    unreadBadge: '#FF0000',
  },
  dark: {
    background: '#0F172A',
    primary: '#27AE60', // MealChat Green (Dark)
    primaryPressed: '#2ecc71',
    surface: '#1E293B',
    surfaceDarker: '#0F172A',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textTertiary: '#B0B8C4',
    border: 'rgba(255, 255, 255, 0.08)',
    input: 'rgba(255, 255, 255, 0.05)',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#FFD600',
    card: 'rgba(255, 255, 255, 0.02)',
    cardBorder: 'rgba(255, 255, 255, 0.05)',
    avatarBg: 'rgba(255, 255, 255, 0.03)',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    badgeBg: 'rgba(255, 255, 255, 0.04)',
    // UI 설계 색상 (다크 톤)
    menuNeeded: '#FF9A4D',
    menuComplete: '#5FE3D8',
    scheduleInProgress: '#6BA5E8',
    confirmed: '#B984E0',
    unreadBadge: '#FF4444',
  }
};

// Default to light mode (White background + Matcha green point)
// Later, they can change this to be dynamic based on a context or state
export const THEME = themeColors.light;

export type ThemeType = typeof themeColors.light;

export const PALETTE_COLORS = [
  '#23A455', // MealChat Green (Default for Rooms)
  '#00A3FF', // MealChat Sky Blue (Default for Notes)
  '#10b981', // Emerald Green
  '#FFD600', // MealChat Yellow
  '#ef4444', // Rose/Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#FF7A00', // MealChat Orange
  '#14b8a6', // Teal
];


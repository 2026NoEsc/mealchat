export const themeColors = {
  light: {
    background: '#FAFAFB',
    primary: '#23A455', // MealChat Green
    primaryPressed: '#1E8E49',
    secondary: '#00A3FF', // MealChat Sky Blue
    accent: '#FF7A00', // MealChat Orange
    surface: '#FFFFFF',
    surfaceDarker: '#E5E7EB',
    text: '#333333',
    textMuted: '#8E8E93',
    border: '#E5E7EB',
    input: '#FFFFFF',
    danger: '#FF6B8B',
    success: '#27AE60',
    warning: '#FFD600', // MealChat Yellow
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    avatarBg: '#E5E7EB',
    modalOverlay: 'rgba(51, 51, 51, 0.4)',
    badgeBg: 'rgba(35, 164, 85, 0.08)',
  },
  dark: {
    background: '#0F172A',
    primary: '#27AE60', // MealChat Green (Dark)
    primaryPressed: '#2ecc71',
    surface: '#1E293B',
    surfaceDarker: '#0F172A',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
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
  }
};

// Default to light mode (White background + Matcha green point)
// Later, they can change this to be dynamic based on a context or state
export const THEME = themeColors.light;

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


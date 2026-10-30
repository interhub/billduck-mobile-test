/** One palette of the brand; both themes have the same keys. */
export type ThemeColors = {
  background: string;
  textPrimary: string;
  card: string;
  accent: string;
  textOnAccent: string;
  surfaceSecondary: string;
  textMuted: string;
  border: string;
  accentText: string;
  success: string;
  error: string;
};

export type ThemeName = 'light' | 'dark';

export const UI_COLORS: Record<ThemeName, ThemeColors> = {
  light: {
    background: '#FAF8F3',
    textPrimary: '#1A1814',
    card: '#FFFFFF',
    accent: '#F2C94C',
    textOnAccent: '#1A1814',
    surfaceSecondary: '#F3F0E8',
    textMuted: '#6F6A62',
    border: '#E8E4DC',
    accentText: '#8A6400',
    success: '#1F9D68',
    error: '#C8323C'
  },
  dark: {
    background: '#13120F',
    textPrimary: '#F4F1EA',
    card: '#1C1B17',
    accent: '#F2C94C',
    textOnAccent: '#1A1814',
    surfaceSecondary: '#24221D',
    textMuted: '#A39E94',
    border: '#2E2B25',
    accentText: '#F2C94C',
    success: '#3DD68C',
    error: '#FF6B6B'
  }
};

/** A dot per recurring payment, by list position: coral, sky, mint, sand, rose. */
export const PAYMENT_DOT_COLORS = ['#E8735A', '#5B8DEF', '#4DBE8F', '#C9A26B', '#E46F9B'] as const;

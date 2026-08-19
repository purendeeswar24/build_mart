/** BuildMart — black · gold */
export const colors = {
  primary: '#D4A017',
  primaryDark: '#B8860B',
  primaryMuted: '#3A2E0A',
  primaryInk: '#1A1400',
  secondary: '#0A0A0A',
  secondaryMuted: '#1F1F1F',
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceMuted: '#2A2A2A',
  surfaceWarm: '#161616',
  border: '#3A3D4A',
  text: '#FFFFFF',
  textSecondary: '#C4C0CE',
  textMuted: '#8B889B',
  textInverse: '#FFFFFF',
  success: '#2DD4BF',
  warning: '#D4A017',
  danger: '#F87171',
  badgeDelivery: '#0A0A0A',
  overlay: 'rgba(10, 10, 10, 0.52)',
  shadow: 'rgba(0, 0, 0, 0.45)',
  sky: '#B3D4EC',
  skyDeep: '#5B9BC9',
} as const;

export const typography = {
  display: {
    fontSize: 26,
    fontWeight: '800' as const,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
  micro: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  section: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0A2846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    shadowColor: '#0A2846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lifted: {
    shadowColor: '#0A2846',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

/** Shared timing — keep springs/durations consistent across the app */
export const motion = {
  fast: 120,
  normal: 220,
  enter: 420,
  exit: 200,
  spring: { speed: 22, bounciness: 8 },
  springSnappy: { speed: 40, bounciness: 6 },
  springPop: { speed: 28, bounciness: 12 },
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  motion,
} as const;

export type Theme = typeof theme;

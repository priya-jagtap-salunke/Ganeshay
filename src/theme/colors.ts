/**
 * Brand seed colors + MD3 tonal roles.
 * Keep `colors.*` exports stable so existing screens keep working
 * while Paper theme uses full Material You roles.
 */
export const colors = {
  // Brand seeds
  deepSaffron: '#FF8C00',
  deepSaffronDark: '#E65100',
  deepSaffronLight: '#FFB74D',
  royalRed: '#B22234',
  royalRedDark: '#8B0000',
  royalRedLight: '#D32F2F',
  gold: '#D4AF37',
  goldLight: '#F4E4BC',
  goldDark: '#B8860B',
  warmIvory: '#FFF8F5',
  warmIvoryDark: '#F5EDE0',
  white: '#FFFFFF',
  black: '#1A1A1A',
  textPrimary: '#1C1B1F',
  textSecondary: '#49454F',
  gray: '#79747E',
  grayLight: '#E7E0EC',
  success: '#2E7D32',
  successContainer: '#C8E6C9',
  pending: '#FF8C00',
  pendingContainer: '#FFE0B2',
  error: '#B3261E',
  errorContainer: '#F9DEDC',

  // Admin portal (secondary scheme)
  adminPrimary: '#0F3460',
  adminPrimaryContainer: '#D6E3F5',
  adminOnPrimary: '#FFFFFF',
  adminSurface: '#F7F9FC',
  adminOnSurface: '#1A1C1E',

  /** @deprecated use royalRed */
  maroon: '#B22234',
  /** @deprecated use warmIvory */
  cream: '#FFF8F5',
  creamDark: '#F5EDE0',
  maroonDark: '#8B0000',
  maroonLight: '#D32F2F',
  orange: '#FF8C00',
  green: '#2E7D32',
} as const;

/** Soft brand washes — prefer tonal surfaces for MD3; keep for hero accents. */
export const gradients = {
  header: ['#B22234', '#8B1A28'] as const,
  hero: ['#C62828', '#B22234'] as const,
  goldShine: ['#F4E4BC', '#D4AF37'] as const,
  card: ['#FFFFFF', '#FFF8F5'] as const,
  admin: ['#0F3460', '#16213E'] as const,
};

/** MD3 color roles derived from brand seeds (light scheme). */
export const md3Colors = {
  primary: colors.royalRed,
  onPrimary: '#FFFFFF',
  primaryContainer: '#FFDAD6',
  onPrimaryContainer: '#410005',

  secondary: '#7A5F00',
  onSecondary: '#FFFFFF',
  secondaryContainer: colors.goldLight,
  onSecondaryContainer: '#261A00',

  tertiary: colors.deepSaffronDark,
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFDCC2',
  onTertiaryContainer: '#2E1500',

  error: colors.error,
  onError: '#FFFFFF',
  errorContainer: colors.errorContainer,
  onErrorContainer: '#410002',

  background: colors.warmIvory,
  onBackground: colors.textPrimary,
  surface: '#FFFBFF',
  onSurface: colors.textPrimary,
  surfaceVariant: '#F5DDDA',
  onSurfaceVariant: colors.textSecondary,
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FFF7F5',
  surfaceContainer: '#FCEEEC',
  surfaceContainerHigh: '#F6E8E6',
  surfaceContainerHighest: '#F0E2E0',

  outline: '#857370',
  outlineVariant: '#D8C2BE',
  inverseSurface: '#362F2E',
  inverseOnSurface: '#FCEEED',
  inversePrimary: '#FFB3AE',
  shadow: '#000000',
  scrim: '#000000',
  elevation: {
    level0: 'transparent',
    level1: '#FFF7F5',
    level2: '#FFF1EE',
    level3: '#FFEBE7',
    level4: '#FFE9E5',
    level5: '#FFE4DF',
  },
} as const;

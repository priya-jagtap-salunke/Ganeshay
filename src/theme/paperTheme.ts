import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { colors, md3Colors } from './colors';

/**
 * Material Design 3 type scale (dp).
 * Uses system font for native Android feel.
 */
const md3TypeScale = {
  displayLarge: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
  },
  displaySmall: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
  },
  titleLarge: {
    fontFamily: 'System',
    fontWeight: '500' as const,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily: 'System',
    fontWeight: '500' as const,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily: 'System',
    fontWeight: '500' as const,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  labelLarge: {
    fontFamily: 'System',
    fontWeight: '500' as const,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: 'System',
    fontWeight: '500' as const,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily: 'System',
    fontWeight: '500' as const,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
};

export const paperTheme = {
  ...MD3LightTheme,
  version: 3 as const,
  dark: false,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    ...md3Colors,
    // Keep legacy Paper keys used by older style paths
    primary: md3Colors.primary,
    secondary: colors.goldDark,
    tertiary: md3Colors.tertiary,
    background: md3Colors.background,
    surface: md3Colors.surface,
    surfaceVariant: md3Colors.surfaceVariant,
    onPrimary: md3Colors.onPrimary,
    onSecondary: md3Colors.onSecondary,
    onTertiary: md3Colors.onTertiary,
    onBackground: md3Colors.onBackground,
    onSurface: md3Colors.onSurface,
    onSurfaceVariant: md3Colors.onSurfaceVariant,
    error: md3Colors.error,
    onError: md3Colors.onError,
    errorContainer: md3Colors.errorContainer,
    onErrorContainer: md3Colors.onErrorContainer,
    outline: md3Colors.outline,
    outlineVariant: md3Colors.outlineVariant,
    inverseSurface: md3Colors.inverseSurface,
    inverseOnSurface: md3Colors.inverseOnSurface,
    inversePrimary: md3Colors.inversePrimary,
    elevation: md3Colors.elevation,
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
  fonts: configureFonts({ config: md3TypeScale }),
};

export type AppTheme = typeof paperTheme;

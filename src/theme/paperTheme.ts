import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { colors } from './colors';

const fontConfig = {
  displayLarge: { fontFamily: 'System', fontWeight: '800' as const, fontSize: 32 },
  headlineLarge: { fontFamily: 'System', fontWeight: '700' as const, fontSize: 28 },
  titleLarge: { fontFamily: 'System', fontWeight: '700' as const, fontSize: 22 },
  bodyLarge: { fontFamily: 'System', fontWeight: '400' as const, fontSize: 18 },
  labelLarge: { fontFamily: 'System', fontWeight: '600' as const, fontSize: 16 },
};

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.royalRed,
    secondary: colors.gold,
    tertiary: colors.deepSaffron,
    background: colors.warmIvory,
    surface: colors.white,
    surfaceVariant: colors.warmIvoryDark,
    onPrimary: colors.white,
    onSecondary: colors.textPrimary,
    error: colors.error,
    outline: colors.grayLight,
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16,
};

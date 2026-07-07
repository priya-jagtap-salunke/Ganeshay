import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const base = (elevation: number, opacity: number, radius: number): ShadowStyle =>
  Platform.select({
    ios: {
      shadowColor: colors.royalRedDark,
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {
      shadowColor: colors.royalRedDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  }) ?? {};

export const shadows = {
  sm: base(2, 0.08, 4),
  md: base(4, 0.12, 8),
  lg: base(8, 0.16, 16),
  gold: Platform.select({
    ios: {
      shadowColor: colors.goldDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
    },
    android: { elevation: 6 },
    default: { elevation: 6 },
  }) ?? {},
};

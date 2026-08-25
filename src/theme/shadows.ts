import { Platform, ViewStyle } from 'react-native';
import { md3Colors } from './colors';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

/**
 * Material Design 3 elevation levels (0–5).
 * Android uses native elevation; iOS approximates with ambient shadow.
 */
function level(elevation: number, opacity: number, radius: number): ShadowStyle {
  if (elevation === 0) {
    return Platform.select({
      ios: {
        shadowColor: md3Colors.shadow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: { elevation: 0 },
      default: { elevation: 0 },
    }) ?? {};
  }

  return (
    Platform.select({
      ios: {
        shadowColor: md3Colors.shadow,
        shadowOffset: { width: 0, height: Math.max(1, elevation / 2) },
        shadowOpacity: opacity,
        shadowRadius: radius,
      },
      android: { elevation },
      default: {
        shadowColor: md3Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation,
      },
    }) ?? {}
  );
}

export const elevation = {
  level0: level(0, 0, 0),
  level1: level(1, 0.05, 2),
  level2: level(3, 0.08, 4),
  level3: level(6, 0.11, 8),
  level4: level(8, 0.12, 10),
  level5: level(12, 0.14, 16),
} as const;

/** @deprecated Prefer `elevation.level*` — kept for existing imports. */
export const shadows = {
  sm: elevation.level1,
  md: elevation.level2,
  lg: elevation.level3,
  gold: elevation.level2,
};

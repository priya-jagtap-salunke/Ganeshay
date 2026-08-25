import { TextStyle } from 'react-native';
import { md3Colors } from './colors';

/**
 * Convenience text styles aligned with MD3 type roles.
 * Prefer Paper `Text` variants (`variant="titleMedium"`) when possible.
 */
export const typography = {
  display: {
    fontSize: 36,
    fontWeight: '400',
    lineHeight: 44,
    letterSpacing: 0,
    color: md3Colors.onSurface,
  } satisfies TextStyle,
  h1: {
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 40,
    color: md3Colors.onSurface,
  } satisfies TextStyle,
  h2: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 32,
    color: md3Colors.onSurface,
  } satisfies TextStyle,
  h3: {
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 28,
    color: md3Colors.onSurface,
  } satisfies TextStyle,
  title: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0.15,
    color: md3Colors.onSurface,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
    color: md3Colors.onSurface,
  } satisfies TextStyle,
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
    color: md3Colors.onSurface,
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
    color: md3Colors.onSurfaceVariant,
  } satisfies TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
    color: md3Colors.onSurfaceVariant,
  } satisfies TextStyle,
  button: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
  } satisfies TextStyle,
};

import { Platform } from 'react-native';

/** True when running in a browser (Expo web). */
export function isWebPlatform(): boolean {
  return Platform.OS === 'web';
}

/**
 * Admin portal login and routes are web-only.
 * Android/iOS builds only expose the vendor portal.
 */
export function isAdminPortalAvailable(): boolean {
  return Platform.OS === 'web';
}

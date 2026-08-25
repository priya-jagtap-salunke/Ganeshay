import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * Redirect target after the user taps the Supabase recovery email link.
 * Must be listed under Authentication → URL Configuration → Redirect URLs.
 *
 * Web: `{origin}/reset-password`
 * Android/iOS standalone: `bappaji://reset-password`
 */
export function getPasswordResetRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`;
  }

  // Prefer the app scheme so standalone APKs open reliably (not Expo Go exp:// URLs).
  return Linking.createURL('reset-password', { scheme: 'bappaji' });
}

import { Platform } from 'react-native';

/** True only in a real browser tab (has DOM + canvas). */
export function isWebBrowser(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  );
}

/** Android/iOS use expo-print — never html2pdf or canvas-based QR. */
export function usesNativePdf(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

import { Linking, Alert, Platform } from 'react-native';
import { toDialNumber } from '../utils/phoneNormalize';

/**
 * Opens the device dialer with the number filled (ACTION_DIAL via tel:).
 * User taps Call in the dialer — no CALL_PHONE permission required.
 */
export async function dialMobile(mobile: string): Promise<void> {
  const number = toDialNumber(mobile);
  if (!number) {
    Alert.alert('Invalid number', 'This contact does not have a valid mobile number.');
    return;
  }

  const url = `tel:${number}`;

  try {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Calling unavailable',
        'Phone calling is not available in the browser. Use the iOS or Android app to dial.'
      );
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open dialer', 'Unable to start a phone call for this number.');
  }
}

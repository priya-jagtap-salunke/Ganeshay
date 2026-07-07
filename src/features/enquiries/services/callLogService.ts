import { Platform, PermissionsAndroid, Alert } from 'react-native';

export interface CallLogEntry {
  phoneNumber: string;
  name: string;
  timestamp: number;
  duration: number;
  type: string;
}

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

function isValidIndianMobile(phone: string): boolean {
  const digits = normalizePhoneNumber(phone);
  return digits.length === 10 && /^[6-9]/.test(digits);
}

async function requestAndroidCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const permissions = [
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  ];

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED
  );
}

type NativeCallLogRow = {
  phoneNumber?: string;
  name?: string;
  timestamp?: string | number;
  duration?: string | number;
  type?: string;
};

export function isCallLogSupported(): boolean {
  return Platform.OS === 'android';
}

export async function fetchRecentCallLogs(
  limit = 40
): Promise<CallLogEntry[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  if (Platform.OS === 'ios') {
    return [];
  }

  const granted = await requestAndroidCallLogPermission();
  if (!granted) {
    throw new Error(
      'Call log permission denied. Allow access in Settings or add the number manually.'
    );
  }

  try {
    const CallLogs = (await import('react-native-call-log')).default;
    const rows = (await CallLogs.load(limit)) as NativeCallLogRow[];

    const seen = new Set<string>();
    const entries: CallLogEntry[] = [];

    for (const row of rows) {
      const phoneNumber = normalizePhoneNumber(row.phoneNumber ?? '');
      if (!isValidIndianMobile(phoneNumber) || seen.has(phoneNumber)) {
        continue;
      }

      seen.add(phoneNumber);
      entries.push({
        phoneNumber,
        name: row.name?.trim() || 'Unknown',
        timestamp: Number(row.timestamp ?? 0),
        duration: Number(row.duration ?? 0),
        type: row.type ?? 'UNKNOWN',
      });
    }

    return entries;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not read call logs';
    throw new Error(
      `${message}. Use an EAS Android build (not Expo Go) with call log permission enabled.`
    );
  }
}

export function showCallLogUnavailableAlert(): void {
  const message =
    Platform.OS === 'ios'
      ? 'iOS does not allow apps to read call logs. Please enter the mobile number manually.'
      : Platform.OS === 'web'
        ? 'Call logs are available on Android only. Please enter the mobile number manually.'
        : 'Call logs need an EAS Android build with READ_CALL_LOG permission. You can enter the number manually.';

  Alert.alert('Call Log Unavailable', message);
}

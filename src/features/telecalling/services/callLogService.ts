import { Platform, Alert, Linking } from 'react-native';

export interface CallLogEntry {
  phoneNumber: string;
  name: string;
  timestamp: number;
  duration: number;
  type: string;
}

const READ_CALL_LOG = 'android.permission.READ_CALL_LOG';

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

function getPermissionsAndroid():
  | typeof import('react-native').PermissionsAndroid
  | null {
  if (Platform.OS !== 'android') return null;

  const { PermissionsAndroid } = require('react-native') as typeof import('react-native');
  if (!PermissionsAndroid?.request) return null;
  return PermissionsAndroid;
}

export function isCallLogSupported(): boolean {
  return Platform.OS === 'android';
}

export async function hasCallLogPermission(): Promise<boolean> {
  const PermissionsAndroid = getPermissionsAndroid();
  if (!PermissionsAndroid) return false;

  try {
    return await PermissionsAndroid.check(READ_CALL_LOG);
  } catch {
    return false;
  }
}

export async function openAppSettings(): Promise<void> {
  if (typeof Linking.openSettings === 'function') {
    await Linking.openSettings();
  }
}

async function requestAndroidCallLogPermission(): Promise<
  'granted' | 'denied' | 'never_ask_again'
> {
  const PermissionsAndroid = getPermissionsAndroid();
  if (!PermissionsAndroid) return 'denied';

  if (await hasCallLogPermission()) {
    return 'granted';
  }

  const result = await PermissionsAndroid.request(READ_CALL_LOG, {
    title: 'Call Log Access',
    message:
      'Allow access to your call log to import recent callers and automatically move No Answer contacts to Call Back when they call you.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'never_ask_again';
  }

  return 'denied';
}

export async function ensureCallLogPermission(): Promise<boolean> {
  const status = await requestAndroidCallLogPermission();
  return status === 'granted';
}

export function showCallLogPermissionAlert(
  status: 'denied' | 'never_ask_again'
): void {
  const message =
    status === 'never_ask_again'
      ? 'Call log access is blocked. Open App Settings → Permissions and enable Call logs, then try again.'
      : 'Call log permission is required to pick a recent call. You can allow it when prompted or add the number manually.';

  Alert.alert('Call Log Permission', message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: () => {
        openAppSettings().catch(() => undefined);
      },
    },
  ]);
}

type NativeCallLogRow = {
  phoneNumber?: string;
  name?: string;
  timestamp?: string | number;
  duration?: string | number;
  type?: string;
};

/** Incoming / missed from the other party (never outgoing). */
export function isIncomingCallType(type: string): boolean {
  const normalized = type.toUpperCase();
  return (
    normalized.includes('INCOMING') ||
    normalized.includes('MISSED') ||
    normalized.includes('REJECTED')
  );
}

function mapNativeCallLogRows(
  rows: NativeCallLogRow[],
  options?: { dedupeByPhone?: boolean }
): CallLogEntry[] {
  const dedupe = options?.dedupeByPhone !== false;
  const seen = new Set<string>();
  const entries: CallLogEntry[] = [];

  for (const row of rows) {
    const phoneNumber = normalizePhoneNumber(row.phoneNumber ?? '');
    if (!isValidIndianMobile(phoneNumber)) continue;
    if (dedupe) {
      if (seen.has(phoneNumber)) continue;
      seen.add(phoneNumber);
    }

    entries.push({
      phoneNumber,
      name: row.name?.trim() || 'Unknown',
      timestamp: Number(row.timestamp ?? 0),
      duration: Number(row.duration ?? 0),
      type: row.type ?? 'UNKNOWN',
    });
  }

  return entries;
}

async function loadNativeCallLogs(limit: number): Promise<CallLogEntry[]> {
  const CallLogs = (await import('react-native-call-log')).default;
  const rows = (await CallLogs.load(limit)) as NativeCallLogRow[];
  return mapNativeCallLogRows(rows, { dedupeByPhone: true });
}

/**
 * Recent call logs for the picker (one row per number, newest first).
 * Prompts for permission and alerts on denial.
 */
export async function fetchRecentCallLogs(
  limit = 40
): Promise<CallLogEntry[]> {
  if (!isCallLogSupported()) {
    return [];
  }

  const permissionStatus = await requestAndroidCallLogPermission();
  if (permissionStatus !== 'granted') {
    showCallLogPermissionAlert(
      permissionStatus === 'never_ask_again' ? 'never_ask_again' : 'denied'
    );
    throw new Error(
      'Call log permission denied. Allow access in Settings or add the number manually.'
    );
  }

  try {
    return await loadNativeCallLogs(limit);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not read call logs';
    throw new Error(
      `${message}. Rebuild the Android app if call logs still do not load.`
    );
  }
}

/**
 * Quiet call-log read for auto Call Back detection.
 * - Android only; returns [] on iOS / web / no permission / errors
 * - Does not show permission alerts
 * - Keeps every log row (no per-number dedupe) so type + timestamp stay accurate
 */
export async function fetchCallLogsForCallbackDetection(
  limit = 120
): Promise<CallLogEntry[]> {
  if (!isCallLogSupported()) {
    return [];
  }

  try {
    if (!(await hasCallLogPermission())) {
      return [];
    }

    const CallLogs = (await import('react-native-call-log')).default;
    const rows = (await CallLogs.load(limit)) as NativeCallLogRow[];
    return mapNativeCallLogRows(rows, { dedupeByPhone: false });
  } catch {
    return [];
  }
}

export function showCallLogUnavailableAlert(): void {
  const message =
    Platform.OS === 'ios'
      ? 'iOS does not allow apps to read call logs. Please enter the mobile number manually.'
      : Platform.OS === 'web'
        ? 'Call logs are available on the Android app only. Please enter the mobile number manually.'
        : 'Call logs need a standalone Android build with READ_CALL_LOG permission. You can enter the number manually.';

  Alert.alert('Call Log Unavailable', message);
}

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const SESSION_KEY = 'murti_photo_picker_session_v1';
const PENDING_URI_KEY = 'murti_photo_picker_pending_uri_v1';

/** Once per JS process — process death creates a new runtime and resets this. */
let androidPickerRecoveryAttempted = false;

export type MurtiPhotoPickerSession = {
  returnTo: 'booking-new' | 'booking-edit';
  bookingId?: string;
};

export async function beginMurtiPhotoPickerSession(
  session: MurtiPhotoPickerSession
): Promise<void> {
  if (Platform.OS === 'web') return;
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function endMurtiPhotoPickerSession(): Promise<void> {
  if (Platform.OS === 'web') return;
  await AsyncStorage.removeItem(SESSION_KEY);
}

async function readMurtiPhotoPickerSession(): Promise<MurtiPhotoPickerSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MurtiPhotoPickerSession;
  } catch {
    return null;
  }
}

export async function stashPendingMurtiPhotoUri(uri: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_URI_KEY, uri);
}

/** Read and clear a photo URI left by Android activity-restart recovery. */
export async function consumePendingMurtiPhotoUri(): Promise<string | null> {
  const uri = await AsyncStorage.getItem(PENDING_URI_KEY);
  if (uri) await AsyncStorage.removeItem(PENDING_URI_KEY);
  return uri;
}

function photoUriFromPending(
  results: (ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult)[]
): string | null {
  for (const result of results) {
    if ('code' in result) continue;
    if (result.canceled || !result.assets?.[0]?.uri) continue;
    return result.assets[0].uri;
  }
  return null;
}

/**
 * After Android kills MainActivity during the system camera/gallery, Expo Router
 * cold-starts on Home. Recover the captured photo (if any) and the screen to return to.
 */
export async function recoverMurtiPhotoPickerAfterActivityRestart(): Promise<{
  session: MurtiPhotoPickerSession;
  photoUri: string | null;
} | null> {
  if (Platform.OS !== 'android') return null;
  if (androidPickerRecoveryAttempted) return null;
  androidPickerRecoveryAttempted = true;

  const session = await readMurtiPhotoPickerSession();
  if (!session) return null;

  let photoUri: string | null = null;
  try {
    const pending = await ImagePicker.getPendingResultAsync();
    photoUri = photoUriFromPending(pending);
  } catch {
    // Pending result may be unavailable on some devices; still restore the screen.
  }

  await endMurtiPhotoPickerSession();

  if (photoUri) {
    await stashPendingMurtiPhotoUri(photoUri);
  }

  return { session, photoUri };
}

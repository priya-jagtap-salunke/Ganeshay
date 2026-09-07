import { Platform, AppState } from 'react-native';

/** Default settle after WhatsApp opens. */
export const WHATSAPP_STEP_DELAY_MS = 900;
/** Max wait for our app to background once WhatsApp is launching. */
const WHATSAPP_FOREGROUND_WAIT_MS = 2800;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * After openDeviceWhatsAppApp, wait until we leave the foreground (WhatsApp
 * has focus) or until timeout — then settle briefly so the follow-up media
 * share is not dropped while WhatsApp is still launching.
 * Same behavior on Android and iOS.
 */
export async function waitForWhatsAppReady(): Promise<void> {
  if (AppState.currentState !== 'active') {
    await delay(Platform.OS === 'ios' ? WHATSAPP_STEP_DELAY_MS : 450);
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      subscription.remove();
      clearTimeout(timer);
      resolve();
    };

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        finish();
      }
    });

    const timer = setTimeout(finish, WHATSAPP_FOREGROUND_WAIT_MS);
  });

  await delay(Platform.OS === 'ios' ? 600 : 500);
}

import { Platform, Alert, Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import { CreateTelecallingContactInput } from '@/types/telecalling';
import {
  isValidIndianMobile,
  normalizeMobile,
} from '../utils/phoneNormalize';

export function isDeviceContactsSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function showDeviceContactsUnavailableAlert(): void {
  Alert.alert(
    'Contacts unavailable',
    'Phone Contacts import and sync are available in the iOS and Android apps only.'
  );
}

async function openAppSettings(): Promise<void> {
  if (typeof Linking.openSettings === 'function') {
    await Linking.openSettings();
  }
}

export async function ensureContactsPermission(): Promise<boolean> {
  if (!isDeviceContactsSupported()) {
    return false;
  }

  try {
    const current = await Contacts.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await Contacts.requestPermissionsAsync();
    if (requested.granted) return true;

    Alert.alert(
      'Contacts Permission',
      'Allow Contacts access to import numbers from your phone and save new ones. You can enable it in App Settings → Permissions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            openAppSettings().catch(() => undefined);
          },
        },
      ]
    );
    return false;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not request contacts permission';
    throw new Error(
      `${message}. Rebuild the app after adding Contacts permissions.`
    );
  }
}

function contactDisplayName(contact: Contacts.Contact): string {
  const full = contact.name?.trim();
  if (full) return full;

  const parts = [contact.firstName, contact.middleName, contact.lastName]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (parts.length) return parts.join(' ');

  const company = contact.company?.trim();
  if (company) return company;

  return '';
}

/**
 * Build a Set of normalized (last-10-digit) mobiles already on the device.
 */
export async function getExistingDeviceMobileSet(): Promise<Set<string>> {
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
    pageSize: 5000,
  });

  const existing = new Set<string>();
  for (const contact of data) {
    for (const phone of contact.phoneNumbers ?? []) {
      const digits = normalizeMobile(phone.number ?? '');
      if (digits.length === 10) {
        existing.add(digits);
      }
    }
  }
  return existing;
}

/** One selectable phone-book row (one valid Indian mobile). */
export interface DeviceContactOption {
  /** Stable key = normalized 10-digit mobile. */
  key: string;
  name: string;
  mobile: string;
  notes: string | null;
}

export interface LoadDeviceContactOptionsResult {
  options: DeviceContactOption[];
  skippedInvalid: number;
  skippedDuplicateOnDevice: number;
}

/**
 * Load device address-book entries as selectable options for in-app multi-select.
 * Does not import anything — only valid Indian mobiles, deduped by last 10 digits.
 */
export async function loadDeviceContactOptions(): Promise<LoadDeviceContactOptionsResult> {
  if (!isDeviceContactsSupported()) {
    throw new Error(
      'Importing from phone Contacts is available in the iOS and Android apps only.'
    );
  }

  const granted = await ensureContactsPermission();
  if (!granted) {
    throw new Error(
      'Contacts permission is required to import numbers from your phone.'
    );
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Name,
      Contacts.Fields.FirstName,
      Contacts.Fields.MiddleName,
      Contacts.Fields.LastName,
      Contacts.Fields.Company,
      Contacts.Fields.Note,
    ],
    pageSize: 5000,
  });

  const byMobile = new Map<string, DeviceContactOption>();
  let skippedInvalid = 0;
  let skippedDuplicateOnDevice = 0;

  for (const contact of data) {
    const name = contactDisplayName(contact);
    const note = contact.note?.trim() || null;
    const phones = contact.phoneNumbers ?? [];

    for (const phone of phones) {
      const mobile = normalizeMobile(phone.number ?? '');
      if (!isValidIndianMobile(mobile)) {
        if ((phone.number ?? '').trim()) {
          skippedInvalid += 1;
        }
        continue;
      }

      if (byMobile.has(mobile)) {
        skippedDuplicateOnDevice += 1;
        continue;
      }

      byMobile.set(mobile, {
        key: mobile,
        name: name || `Contact ${mobile}`,
        mobile,
        notes: note,
      });
    }
  }

  const options = [...byMobile.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  return {
    options,
    skippedInvalid,
    skippedDuplicateOnDevice,
  };
}

export function deviceOptionsToImportInputs(
  options: DeviceContactOption[]
): CreateTelecallingContactInput[] {
  return options.map((opt) => ({
    name: opt.name,
    mobile: opt.mobile,
    notes: opt.notes,
    synced_to_device: true,
  }));
}

export interface SyncContactInput {
  name: string;
  mobile: string;
  notes?: string | null;
}

export interface SyncToDeviceResult {
  added: number;
  skippedExisting: number;
  failed: number;
}

/**
 * Add contacts to the device address book when the mobile is not already present.
 * Duplicate detection: normalize to last 10 digits and compare against all device phone numbers.
 */
export async function syncContactsToDevice(
  contacts: SyncContactInput[]
): Promise<SyncToDeviceResult> {
  if (!isDeviceContactsSupported()) {
    return { added: 0, skippedExisting: contacts.length, failed: 0 };
  }

  const granted = await ensureContactsPermission();
  if (!granted) {
    throw new Error(
      'Contacts permission is required to save numbers to your phone.'
    );
  }

  const existing = await getExistingDeviceMobileSet();

  let added = 0;
  let skippedExisting = 0;
  let failed = 0;

  for (const contact of contacts) {
    const mobile = normalizeMobile(contact.mobile);
    if (!isValidIndianMobile(mobile)) {
      failed += 1;
      continue;
    }

    if (existing.has(mobile)) {
      skippedExisting += 1;
      continue;
    }

    try {
      const displayName = contact.name.trim() || mobile;
      await Contacts.addContactAsync({
        contactType: Contacts.ContactTypes.Person,
        name: displayName,
        firstName: displayName,
        phoneNumbers: [
          {
            label: 'mobile',
            number: `+91${mobile}`,
          },
        ],
        ...(contact.notes?.trim() ? { note: contact.notes.trim() } : {}),
      });
      existing.add(mobile);
      added += 1;
    } catch {
      failed += 1;
    }
  }

  return { added, skippedExisting, failed };
}

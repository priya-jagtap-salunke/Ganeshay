import { Platform, Alert, Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import { CreateTelecallingContactInput } from '@/types/telecalling';
import {
  isValidIndianMobile,
  normalizeMobile,
} from '../utils/phoneNormalize';

/** Fields safe on both platforms. Never request Note on iOS — it needs a special
 * Apple entitlement; without it getContactsAsync fails and returns null. */
const CONTACT_READ_FIELDS: Contacts.FieldType[] = [
  Contacts.Fields.PhoneNumbers,
  Contacts.Fields.Name,
  Contacts.Fields.FirstName,
  Contacts.Fields.MiddleName,
  Contacts.Fields.LastName,
  Contacts.Fields.Nickname,
  Contacts.Fields.Company,
];

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

function showContactsPermissionDeniedAlert(): void {
  Alert.alert(
    'Contacts Permission',
    'Allow Contacts access to import numbers from your phone and save new ones. You can enable it in App Settings → Permissions (or Privacy → Contacts on iPhone).',
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
}

/**
 * True when the OS granted full or limited (iOS 18+) contacts access.
 */
function hasContactsAccess(
  response: Contacts.PermissionResponse
): boolean {
  if (response.granted) return true;
  // iOS 18+ may expose limited access on newer native modules.
  const privileges = (
    response as Contacts.PermissionResponse & {
      accessPrivileges?: 'all' | 'limited' | 'none';
    }
  ).accessPrivileges;
  if (Platform.OS === 'ios' && privileges === 'limited') {
    return true;
  }
  return false;
}

function getAccessPrivileges(
  response: Contacts.PermissionResponse
): 'all' | 'limited' | 'none' | undefined {
  return (
    response as Contacts.PermissionResponse & {
      accessPrivileges?: 'all' | 'limited' | 'none';
    }
  ).accessPrivileges;
}

export async function ensureContactsPermission(): Promise<boolean> {
  if (!isDeviceContactsSupported()) {
    return false;
  }

  try {
    const current = await Contacts.getPermissionsAsync();
    if (hasContactsAccess(current)) return true;

    if (current.status === Contacts.PermissionStatus.DENIED && !current.canAskAgain) {
      showContactsPermissionDeniedAlert();
      return false;
    }

    const requested = await Contacts.requestPermissionsAsync();
    if (hasContactsAccess(requested)) return true;

    showContactsPermissionDeniedAlert();
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

  const nickname = contact.nickname?.trim();
  if (nickname) return nickname;

  const company = contact.company?.trim();
  if (company) return company;

  return '';
}

/** Prefer digits (iOS) then formatted number — both normalize to last 10. */
function phoneToMobile(phone: Contacts.PhoneNumber): string {
  const raw = (phone.digits || phone.number || '').trim();
  return normalizeMobile(raw);
}

function isGenericContactName(name: string, mobile: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed === mobile) return true;
  if (trimmed === `Contact ${mobile}`) return true;
  return false;
}

/** When two phonebook entries share a mobile, keep the better display name. */
function pickBetterOption(
  existing: DeviceContactOption,
  candidate: DeviceContactOption
): DeviceContactOption {
  const existingGeneric = isGenericContactName(existing.name, existing.mobile);
  const candidateGeneric = isGenericContactName(
    candidate.name,
    candidate.mobile
  );
  if (existingGeneric && !candidateGeneric) return candidate;
  if (!existingGeneric && candidateGeneric) return existing;
  if (candidate.name.trim().length > existing.name.trim().length) {
    return candidate;
  }
  return existing;
}

/**
 * Fetch all device contacts with reliable pagination.
 * Dedupes by contact id so partial/overlapping pages never drop or double rows.
 */
async function fetchAllDeviceContacts(
  fields: Contacts.FieldType[]
): Promise<Contacts.Contact[]> {
  const pageSize = 300;
  const byId = new Map<string, Contacts.Contact>();
  let pageOffset = 0;
  let guard = 0;

  while (guard < 250) {
    guard += 1;
    let page: Contacts.ContactResponse;
    try {
      page = await Contacts.getContactsAsync({
        fields,
        pageSize,
        pageOffset,
        sort: Contacts.SortTypes.FirstName,
      });
    } catch (error) {
      // If offset paging fails after some data, return what we have.
      if (byId.size > 0) break;
      throw error;
    }

    const rows = page?.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      break;
    }

    for (let i = 0; i < rows.length; i += 1) {
      const contact = rows[i];
      const id =
        (contact.id && String(contact.id).trim()) ||
        `offset-${pageOffset}-row-${i}`;
      if (!byId.has(id)) {
        byId.set(id, contact);
      }
    }

    if (!page.hasNextPage) {
      break;
    }
    pageOffset += rows.length;
  }

  return [...byId.values()];
}

/**
 * Build a Set of normalized (last-10-digit) mobiles already on the device.
 */
export async function getExistingDeviceMobileSet(): Promise<Set<string>> {
  const data = await fetchAllDeviceContacts([Contacts.Fields.PhoneNumbers]);

  const existing = new Set<string>();
  for (const contact of data) {
    for (const phone of contact.phoneNumbers ?? []) {
      const digits = phoneToMobile(phone);
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
  accessLimited: boolean;
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
      'Contacts permission is required to import numbers from your phone. Enable it in Settings and try again.'
    );
  }

  let accessLimited = false;
  try {
    const perm = await Contacts.getPermissionsAsync();
    accessLimited = getAccessPrivileges(perm) === 'limited';
  } catch {
    // Optional metadata — ignore.
  }

  let data: Contacts.Contact[];
  try {
    data = await fetchAllDeviceContacts(CONTACT_READ_FIELDS);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not read phone contacts';
    throw new Error(
      `${message}. If this persists on iPhone, open Settings → Ganeshay → Contacts and allow access, then reopen the app.`
    );
  }

  const byMobile = new Map<string, DeviceContactOption>();
  let skippedInvalid = 0;
  let skippedDuplicateOnDevice = 0;

  for (const contact of data) {
    const name = contactDisplayName(contact);
    const phones = [...(contact.phoneNumbers ?? [])].sort((a, b) => {
      // Prefer primary numbers so the right label wins when duplicates exist.
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });

    for (const phone of phones) {
      const raw = (phone.digits || phone.number || '').trim();
      if (!raw) continue;

      const mobile = phoneToMobile(phone);
      if (!isValidIndianMobile(mobile)) {
        skippedInvalid += 1;
        continue;
      }

      const candidate: DeviceContactOption = {
        key: mobile,
        name: name || `Contact ${mobile}`,
        mobile,
        notes: null,
      };

      const existing = byMobile.get(mobile);
      if (existing) {
        skippedDuplicateOnDevice += 1;
        byMobile.set(mobile, pickBetterOption(existing, candidate));
        continue;
      }

      byMobile.set(mobile, candidate);
    }
  }

  const options = [...byMobile.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  return {
    options,
    skippedInvalid,
    skippedDuplicateOnDevice,
    accessLimited,
  };
}

export function deviceOptionsToImportInputs(
  options: DeviceContactOption[]
): CreateTelecallingContactInput[] {
  const byMobile = new Map<string, CreateTelecallingContactInput>();

  for (const opt of options) {
    const mobile = normalizeMobile(opt.mobile);
    if (!isValidIndianMobile(mobile)) continue;

    const name = (opt.name || '').trim() || `Contact ${mobile}`;
    const next: CreateTelecallingContactInput = {
      name,
      mobile,
      notes: opt.notes,
      synced_to_device: true,
    };

    const existing = byMobile.get(mobile);
    if (!existing) {
      byMobile.set(mobile, next);
      continue;
    }

    // Keep the better name if the same mobile was selected twice.
    if (
      isGenericContactName(existing.name, mobile) &&
      !isGenericContactName(name, mobile)
    ) {
      byMobile.set(mobile, next);
    } else if (name.length > existing.name.length) {
      byMobile.set(mobile, next);
    }
  }

  return [...byMobile.values()];
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
 * Notes are omitted on iOS (requires a special Apple entitlement).
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
      const payload: Contacts.Contact = {
        contactType: Contacts.ContactTypes.Person,
        name: displayName,
        firstName: displayName,
        phoneNumbers: [
          {
            label: 'mobile',
            number: `+91${mobile}`,
          },
        ],
      };
      // Contact Notes entitlement is not configured — only set notes on Android.
      if (Platform.OS === 'android' && contact.notes?.trim()) {
        payload.note = contact.notes.trim();
      }
      await Contacts.addContactAsync(payload);
      existing.add(mobile);
      added += 1;
    } catch {
      failed += 1;
    }
  }

  return { added, skippedExisting, failed };
}

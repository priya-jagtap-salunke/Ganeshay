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
  Contacts.Fields.ID,
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
  if (response.status === Contacts.PermissionStatus.GRANTED) return true;
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

    // Permanently denied — must open Settings.
    if (
      current.status === Contacts.PermissionStatus.DENIED &&
      current.canAskAgain === false
    ) {
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

/** Digits-only from any phone field (Android often has `number` only, not `digits`). */
function rawPhoneDigits(phone: Contacts.PhoneNumber): string {
  const parts = [phone.digits, phone.number]
    .map((value) => (value || '').trim())
    .filter(Boolean);
  // Prefer the longest digit run after stripping non-digits.
  let best = '';
  for (const raw of parts) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length > best.length) best = digits;
  }
  return best;
}

/**
 * Prefer digits (iOS) then formatted number — both normalize to last 10.
 * Also accepts +91 / 0-prefixed Indian mobiles from the phone book.
 */
function phoneToMobile(phone: Contacts.PhoneNumber): string {
  const digits = rawPhoneDigits(phone);
  if (!digits) return '';

  // Direct last-10 (covers +91XXXXXXXXXX and plain 10-digit).
  const last10 = normalizeMobile(digits);
  if (isValidIndianMobile(last10)) return last10;

  // Strip leading 91 / 0 then re-check.
  let rest = digits;
  if (rest.startsWith('91') && rest.length > 10) {
    rest = rest.slice(2);
  } else if (rest.startsWith('0') && rest.length > 10) {
    rest = rest.slice(1);
  }
  const normalized = normalizeMobile(rest);
  if (isValidIndianMobile(normalized)) return normalized;

  return last10;
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
 * Fetch all device contacts with reliable paging.
 *
 * Android quirk: pageSize 0 ("get all") still sets hasNextPage=true when any
 * contacts exist, so we always page with an explicit pageSize and stop when a
 * page returns fewer rows than requested or hasNextPage is false.
 */
async function fetchAllDeviceContacts(
  fields: Contacts.FieldType[]
): Promise<Contacts.Contact[]> {
  const byId = new Map<string, Contacts.Contact>();

  const remember = (rows: Contacts.Contact[], offsetLabel: number) => {
    for (let i = 0; i < rows.length; i += 1) {
      const contact = rows[i];
      const id =
        (contact.id && String(contact.id).trim()) ||
        `offset-${offsetLabel}-row-${i}`;
      if (!byId.has(id)) {
        byId.set(id, contact);
      }
    }
  };

  const pageSize = 300;
  let pageOffset = 0;
  let guard = 0;
  let pagedError: unknown = null;

  while (guard < 500) {
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
      pagedError = error;
      break;
    }

    const rows = page?.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      break;
    }
    remember(rows, pageOffset);

    // Stop when native says done, or when we got a short final page.
    if (!page.hasNextPage || rows.length < pageSize) {
      break;
    }
    pageOffset += pageSize;
  }

  if (byId.size > 0) {
    return [...byId.values()];
  }

  // Fallback: unpaged dump (still useful if paging failed / empty quirk).
  try {
    const all = await Contacts.getContactsAsync({
      fields,
      sort: Contacts.SortTypes.FirstName,
    });
    if (Array.isArray(all?.data) && all.data.length > 0) {
      remember(all.data, 0);
    }
  } catch (error) {
    if (pagedError) throw pagedError;
    throw error;
  }

  if (byId.size === 0 && pagedError) {
    throw pagedError;
  }

  return [...byId.values()];
}

/**
 * Build a Set of normalized (last-10-digit) mobiles already on the device.
 */
export async function getExistingDeviceMobileSet(): Promise<Set<string>> {
  const data = await fetchAllDeviceContacts([
    Contacts.Fields.ID,
    Contacts.Fields.PhoneNumbers,
  ]);

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
  /** Raw contacts returned by the OS (before phone filtering). */
  deviceContactCount: number;
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
      `${message}. If this persists, open Settings → Ganeshay → Contacts and allow access, then reopen the app.`
    );
  }

  const byMobile = new Map<string, DeviceContactOption>();
  let skippedInvalid = 0;
  let skippedDuplicateOnDevice = 0;

  for (const contact of data) {
    const name = contactDisplayName(contact);
    const phones = [...(contact.phoneNumbers ?? [])].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });

    if (phones.length === 0) {
      skippedInvalid += 1;
      continue;
    }

    for (const phone of phones) {
      const raw = rawPhoneDigits(phone);
      if (!raw) {
        skippedInvalid += 1;
        continue;
      }

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
    deviceContactCount: data.length,
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

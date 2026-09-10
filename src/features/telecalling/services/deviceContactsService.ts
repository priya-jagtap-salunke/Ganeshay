import { Platform, Alert, Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import { CreateTelecallingContactInput } from '@/types/telecalling';
import {
  isImportableMobile,
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
  let best = '';
  for (const raw of parts) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length > best.length) best = digits;
  }
  return best;
}

/**
 * Normalize a phone-book number to 10 digits for import.
 * Accepts +91 / 0 prefixes and any 10-digit local number.
 */
function phoneToMobile(phone: Contacts.PhoneNumber): string {
  const digits = rawPhoneDigits(phone);
  if (!digits) return '';

  // Prefer Indian mobile shape when the full string is longer.
  if (digits.startsWith('91') && digits.length >= 12) {
    const local = digits.slice(2);
    const mobile = normalizeMobile(local);
    if (isImportableMobile(mobile)) return mobile;
  }
  if (digits.startsWith('0') && digits.length >= 11) {
    const mobile = normalizeMobile(digits.slice(1));
    if (isImportableMobile(mobile)) return mobile;
  }

  const last10 = normalizeMobile(digits);
  if (isImportableMobile(last10)) return last10;
  return last10;
}

function isGenericContactName(name: string, mobile: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed === mobile) return true;
  if (trimmed === `Contact ${mobile}`) return true;
  return false;
}

function pickBetterOption(
  existing: DeviceContactOption,
  candidate: DeviceContactOption
): DeviceContactOption {
  const existingGeneric = isGenericContactName(existing.name, existing.mobile);
  const candidateGeneric = isGenericContactName(
    candidate.name,
    candidate.mobile
  );
  // Prefer a name that isn't just the number.
  if (existingGeneric && !candidateGeneric) return candidate;
  if (!existingGeneric && candidateGeneric) return existing;
  // Prefer Indian-mobile-shaped numbers when merging same key (shouldn't happen).
  const existingIndian = isValidIndianMobile(existing.mobile);
  const candidateIndian = isValidIndianMobile(candidate.mobile);
  if (!existingIndian && candidateIndian) return candidate;
  if (candidate.name.trim().length > existing.name.trim().length) {
    return candidate;
  }
  return existing;
}

function rememberContacts(
  byId: Map<string, Contacts.Contact>,
  rows: Contacts.Contact[],
  offsetLabel: number
): void {
  for (let i = 0; i < rows.length; i += 1) {
    const contact = rows[i];
    const id =
      (contact.id && String(contact.id).trim()) ||
      `offset-${offsetLabel}-row-${i}-${contactDisplayName(contact)}-${i}`;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, contact);
      continue;
    }
    // Prefer the copy that has phone numbers.
    const prevPhones = prev.phoneNumbers?.length ?? 0;
    const nextPhones = contact.phoneNumbers?.length ?? 0;
    if (nextPhones > prevPhones) {
      byId.set(id, contact);
    }
  }
}

/**
 * Fetch every device contact the OS will give us.
 *
 * Android: pageSize 0 returns all contacts but sets hasNextPage incorrectly —
 * we always keep the full `data` array from that call, then also page+merge.
 */
async function fetchAllDeviceContacts(
  fields: Contacts.FieldType[]
): Promise<Contacts.Contact[]> {
  const byId = new Map<string, Contacts.Contact>();

  const tryFetch = async (
    options: Contacts.ContactQuery,
    label: number
  ): Promise<void> => {
    const page = await Contacts.getContactsAsync(options);
    if (Array.isArray(page?.data) && page.data.length > 0) {
      rememberContacts(byId, page.data, label);
    }
  };

  // 1) Unpaged dump — primary path (docs: pageSize 0 / omitted = all contacts).
  try {
    await tryFetch({ fields }, 0);
  } catch {
    // continue
  }

  // 2) Unpaged with FirstName sort (some devices only fill phones when sorted).
  try {
    await tryFetch({ fields, sort: Contacts.SortTypes.FirstName }, 1);
  } catch {
    // continue
  }

  // 3) Explicit paging — merge anything the unpaged call missed.
  const pageSize = 100;
  let pageOffset = 0;
  let guard = 0;
  while (guard < 1000) {
    guard += 1;
    let page: Contacts.ContactResponse;
    try {
      page = await Contacts.getContactsAsync({
        fields,
        pageSize,
        pageOffset,
        sort: Contacts.SortTypes.FirstName,
      });
    } catch {
      break;
    }

    const rows = page?.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      break;
    }
    rememberContacts(byId, rows, 1000 + pageOffset);

    // Android hasNextPage with pageSize>0 is reliable; also stop on short page.
    if (!page.hasNextPage || rows.length < pageSize) {
      break;
    }
    pageOffset += pageSize;
  }

  // 4) iOS: also pull raw (non-unified) contacts — can surface more numbers.
  if (Platform.OS === 'ios') {
    try {
      await tryFetch(
        {
          fields,
          rawContacts: true,
          sort: Contacts.SortTypes.FirstName,
        },
        5000
      );
    } catch {
      // optional
    }
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
      if (isImportableMobile(digits)) {
        existing.add(digits);
      }
    }
  }
  return existing;
}

/** One selectable phone-book row (one importable 10-digit mobile). */
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
 * Shows every phone-book contact that has a usable 10-digit number.
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
      `${message}. Open Settings → Ganeshay → Contacts, allow Full Access, then reopen the app.`
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
      // Prefer numbers that look like Indian mobiles.
      const aScore = isValidIndianMobile(phoneToMobile(a)) ? 1 : 0;
      const bScore = isValidIndianMobile(phoneToMobile(b)) ? 1 : 0;
      return bScore - aScore;
    });

    if (phones.length === 0) {
      skippedInvalid += 1;
      continue;
    }

    let addedForContact = false;
    for (const phone of phones) {
      const raw = rawPhoneDigits(phone);
      if (!raw) {
        continue;
      }

      const mobile = phoneToMobile(phone);
      if (!isImportableMobile(mobile)) {
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
        addedForContact = true;
        continue;
      }

      byMobile.set(mobile, candidate);
      addedForContact = true;
    }

    if (!addedForContact) {
      skippedInvalid += 1;
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
    if (!isImportableMobile(mobile)) continue;

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
    if (!isImportableMobile(mobile)) {
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

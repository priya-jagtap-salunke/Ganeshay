import type {
  TeleMessagingKind,
  TeleMessagingStatus,
} from './telemessaging';

/** Latest outcome mirrored on the contact (also used for list filters). */
export type TelecallingCallStatus =
  | 'pending'
  | 'connected'
  | 'callback'
  | 'no_answer'
  | 'disconnected'
  | 'busy'
  | 'declined'
  | 'call_again'
  | 'wrong_number'
  | 'other';

/** Outcome recorded after a dial attempt (never "pending"). */
export type TelecallingCallOutcome = Exclude<TelecallingCallStatus, 'pending'>;

export type TelecallingFilterId =
  | 'all'
  | 'remaining'
  | 'called'
  | 'callback'
  | 'call_again'
  | 'no_answer_busy'
  | 'declined'
  | 'wrong_number';

export interface TelecallingContact {
  id: string;
  name: string;
  mobile: string;
  notes: string | null;
  call_status: TelecallingCallStatus;
  last_called_at: string | null;
  last_outcome_notes: string | null;
  /** WhatsApp Tele-messaging status (same contact row). */
  message_status: TeleMessagingStatus;
  last_messaged_at: string | null;
  last_message_notes: string | null;
  last_message_kind: TeleMessagingKind | null;
  synced_to_device: boolean;
  created_at: string;
  updated_at: string;
}

export interface TelecallingCallLog {
  id: string;
  contact_id: string;
  outcome: TelecallingCallOutcome;
  notes: string | null;
  called_at: string;
  created_at: string;
}

export interface CreateTelecallingContactInput {
  name: string;
  mobile: string;
  notes?: string | null;
  synced_to_device?: boolean;
}

export interface RecordCallOutcomeInput {
  contactId: string;
  outcome: TelecallingCallOutcome;
  notes?: string | null;
}

export interface ParsedExcelContact {
  name: string;
  mobile: string;
  notes: string | null;
}

export const TELECALLING_OUTCOMES: {
  value: TelecallingCallOutcome;
  label: string;
}[] = [
  { value: 'connected', label: 'Connected / received' },
  { value: 'callback', label: 'Call Back / customer called back' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'disconnected', label: 'Disconnected / dropped' },
  { value: 'busy', label: 'Busy' },
  { value: 'declined', label: 'Declined / rejected' },
  { value: 'call_again', label: 'Ask to call again later' },
  { value: 'wrong_number', label: 'Wrong number' },
  { value: 'other', label: 'Other' },
];

export const TELECALLING_FILTERS: {
  id: TelecallingFilterId;
  label: string;
  statuses: TelecallingCallStatus[] | null;
}[] = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'remaining', label: 'Remaining to call', statuses: ['pending'] },
  {
    id: 'called',
    label: 'Already called',
    statuses: ['connected', 'other'],
  },
  {
    id: 'callback',
    label: 'Call Back',
    statuses: ['callback'],
  },
  { id: 'call_again', label: 'Need to call again', statuses: ['call_again'] },
  {
    id: 'no_answer_busy',
    label: 'No answer / busy',
    statuses: ['no_answer', 'busy', 'disconnected'],
  },
  { id: 'declined', label: 'Declined', statuses: ['declined'] },
  { id: 'wrong_number', label: 'Wrong number', statuses: ['wrong_number'] },
];

/** Every non-pending outcome must belong to at least one segment filter. */
const FILTER_STATUS_COVERAGE: TelecallingCallStatus[] =
  TELECALLING_FILTERS.flatMap((f) => f.statuses ?? []);

/**
 * Map legacy / unexpected DB values onto the current status model so filters
 * never drop a contact that still exists in the list.
 */
export function normalizeTelecallingStatus(
  raw: string | null | undefined
): TelecallingCallStatus {
  switch (raw) {
    case 'pending':
    case 'connected':
    case 'callback':
    case 'no_answer':
    case 'disconnected':
    case 'busy':
    case 'declined':
    case 'call_again':
    case 'wrong_number':
    case 'other':
      return raw;
    // Legacy statuses from the first telecalling migration draft
    case 'called':
    case 'interested':
      return 'connected';
    case 'not_interested':
      return 'declined';
    default:
      // Unknown but non-empty → keep visible under All / Already called
      return raw ? 'other' : 'pending';
  }
}

/**
 * Resolve display/filter status, including legacy "connected + called back note"
 * rows that predate the dedicated `callback` status.
 */
export function resolveTelecallingStatus(
  status: TelecallingCallStatus | string | null | undefined,
  notes?: string | null
): TelecallingCallStatus {
  const normalized = normalizeTelecallingStatus(status);
  if (
    normalized === 'connected' &&
    (notes ?? '').toLowerCase().includes('called back')
  ) {
    return 'callback';
  }
  return normalized;
}

export function contactMatchesFilter(
  status: TelecallingCallStatus,
  filterId: TelecallingFilterId,
  notes?: string | null
): boolean {
  const normalized = resolveTelecallingStatus(status, notes);
  const def = TELECALLING_FILTERS.find((f) => f.id === filterId);
  if (!def || def.statuses == null) return true;
  return def.statuses.includes(normalized);
}

export function getOutcomeLabel(status: TelecallingCallStatus): string {
  const normalized = normalizeTelecallingStatus(status);
  if (normalized === 'pending') return 'Not called';
  return (
    TELECALLING_OUTCOMES.find((item) => item.value === normalized)?.label ??
    normalized
  );
}

/** Compact labels for list rows (avoids clutter on mobile). */
export function getOutcomeShortLabel(status: TelecallingCallStatus): string {
  switch (normalizeTelecallingStatus(status)) {
    case 'pending':
      return 'Not called';
    case 'connected':
      return 'Connected';
    case 'callback':
      return 'Call Back';
    case 'no_answer':
      return 'No answer';
    case 'disconnected':
      return 'Disconnected';
    case 'busy':
      return 'Busy';
    case 'declined':
      return 'Declined';
    case 'call_again':
      return 'Call again';
    case 'wrong_number':
      return 'Wrong number';
    case 'other':
      return 'Other';
    default:
      return status;
  }
}

/** Statuses that sit under the No answer / busy filter. */
export function isNoAnswerBusyStatus(
  status: TelecallingCallStatus
): boolean {
  const normalized = normalizeTelecallingStatus(status);
  return (
    normalized === 'no_answer' ||
    normalized === 'busy' ||
    normalized === 'disconnected'
  );
}

/**
 * Row label that recognizes a connected outcome saved as a customer callback.
 */
export function getContactOutcomeShortLabel(
  status: TelecallingCallStatus,
  notes?: string | null
): string {
  return getOutcomeShortLabel(resolveTelecallingStatus(status, notes));
}

export const CALLED_BACK_NOTE = 'Customer called back';
export const AUTO_CALLBACK_NOTE = 'Auto-detected incoming call (Call Back)';

/** Dev-time sanity: every outcome except pending is covered by a segment. */
export function assertTelecallingFilterCoverage(): void {
  const covered = new Set(FILTER_STATUS_COVERAGE);
  for (const outcome of TELECALLING_OUTCOMES) {
    if (!covered.has(outcome.value)) {
      throw new Error(
        `Telecalling filter gap: outcome "${outcome.value}" is not in any segment`
      );
    }
  }
}

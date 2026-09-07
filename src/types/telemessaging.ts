/** Latest WhatsApp message status mirrored on the shared contact. */
export type TeleMessagingStatus = 'pending' | 'sent';

/** Status that can be saved on a contact (Pending or Sent). */
export type TeleMessagingOutcome = TeleMessagingStatus;

export type TeleMessagingKind = 'predraft' | 'catalog';

export type TeleMessagingFilterId = 'pending' | 'sent';

export interface RecordMessageOutcomeInput {
  contactId: string;
  outcome: TeleMessagingOutcome;
  notes?: string | null;
  messageKind?: TeleMessagingKind | null;
}

export const TELEMESSAGING_OUTCOMES: {
  value: TeleMessagingOutcome;
  label: string;
}[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
];

export const TELEMESSAGING_FILTERS: {
  id: TeleMessagingFilterId;
  label: string;
  statuses: TeleMessagingStatus[];
}[] = [
  { id: 'pending', label: 'Pending', statuses: ['pending'] },
  { id: 'sent', label: 'Sent', statuses: ['sent'] },
];

/**
 * Map DB / legacy values onto pending | sent.
 * Legacy: delivered → sent; not_delivered / follow_up / etc → pending.
 */
export function normalizeTeleMessagingStatus(
  raw: string | null | undefined
): TeleMessagingStatus {
  switch (raw) {
    case 'pending':
    case 'sent':
      return raw;
    case 'delivered':
      return 'sent';
    case 'not_delivered':
    case 'follow_up':
    case 'not_interested':
    case 'other':
      return 'pending';
    default:
      return 'pending';
  }
}

export function contactMatchesMessageFilter(
  status: TeleMessagingStatus | string | null | undefined,
  filterId: TeleMessagingFilterId
): boolean {
  const normalized = normalizeTeleMessagingStatus(status);
  const def = TELEMESSAGING_FILTERS.find((f) => f.id === filterId);
  if (!def) return true;
  return def.statuses.includes(normalized);
}

export function getMessageStatusLabel(status: TeleMessagingStatus): string {
  return normalizeTeleMessagingStatus(status) === 'sent' ? 'Sent' : 'Pending';
}

export function getMessageStatusShortLabel(
  status: TeleMessagingStatus,
  kind?: TeleMessagingKind | null
): string {
  if (normalizeTeleMessagingStatus(status) === 'pending') {
    return 'Pending';
  }
  if (kind === 'catalog') return 'Catalog sent';
  if (kind === 'predraft') return 'Details sent';
  return 'Sent';
}

export function normalizeTeleMessagingKind(
  raw: string | null | undefined
): TeleMessagingKind | null {
  if (raw === 'predraft' || raw === 'catalog') return raw;
  return null;
}

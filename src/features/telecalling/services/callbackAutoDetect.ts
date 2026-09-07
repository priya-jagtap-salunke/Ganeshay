import {
  AUTO_CALLBACK_NOTE,
  TelecallingContact,
  isNoAnswerBusyStatus,
  resolveTelecallingStatus,
} from '@/types/telecalling';
import {
  CallLogEntry,
  fetchCallLogsForCallbackDetection,
  isIncomingCallType,
} from './callLogService';
import { normalizeMobile } from '../utils/phoneNormalize';

export interface CallbackAutoDetectMatch {
  contact: TelecallingContact;
  callTimestamp: number;
  notes: string;
}

/**
 * Match No Answer / busy contacts to later incoming (or missed) device calls.
 * Outgoing dials never qualify — returning from Phone after dialing will not move them.
 */
export function findNoAnswerCallbackMatches(
  contacts: TelecallingContact[],
  callLogs: CallLogEntry[]
): CallbackAutoDetectMatch[] {
  const byMobile = new Map<string, TelecallingContact>();

  for (const contact of contacts) {
    const status = resolveTelecallingStatus(
      contact.call_status,
      contact.last_outcome_notes
    );
    if (!isNoAnswerBusyStatus(status)) continue;
    const mobile = normalizeMobile(contact.mobile);
    if (!mobile || byMobile.has(mobile)) continue;
    byMobile.set(mobile, contact);
  }

  if (byMobile.size === 0) return [];

  const matches = new Map<string, CallbackAutoDetectMatch>();

  for (const entry of callLogs) {
    if (!isIncomingCallType(entry.type)) continue;
    if (!entry.timestamp) continue;

    const contact = byMobile.get(entry.phoneNumber);
    if (!contact) continue;

    const markedAt = contact.last_called_at
      ? new Date(contact.last_called_at).getTime()
      : 0;
    // Only after they were marked no_answer / busy / disconnected
    if (Number.isFinite(markedAt) && entry.timestamp <= markedAt) {
      continue;
    }

    const existing = matches.get(contact.id);
    if (!existing || entry.timestamp > existing.callTimestamp) {
      matches.set(contact.id, {
        contact,
        callTimestamp: entry.timestamp,
        notes: AUTO_CALLBACK_NOTE,
      });
    }
  }

  return [...matches.values()];
}

/**
 * Read Android call log and return No Answer contacts who have since called in.
 * No-ops on iOS (cannot read call history).
 */
export async function detectIncomingCallbacks(
  contacts: TelecallingContact[]
): Promise<CallbackAutoDetectMatch[]> {
  const candidates = contacts.filter((c) =>
    isNoAnswerBusyStatus(
      resolveTelecallingStatus(c.call_status, c.last_outcome_notes)
    )
  );
  if (candidates.length === 0) return [];

  const logs = await fetchCallLogsForCallbackDetection(120);
  if (logs.length === 0) return [];

  return findNoAnswerCallbackMatches(candidates, logs);
}

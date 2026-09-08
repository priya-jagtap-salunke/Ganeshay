import { supabase } from '@/lib/supabase';
import {
  CreateTelecallingContactInput,
  RecordCallOutcomeInput,
  TelecallingContact,
  TELECALLING_OUTCOMES,
  resolveTelecallingStatus,
} from '@/types/telecalling';
import {
  RecordMessageOutcomeInput,
  TELEMESSAGING_OUTCOMES,
  normalizeTeleMessagingKind,
  normalizeTeleMessagingStatus,
} from '@/types/telemessaging';
import { getErrorMessage, getSupabaseConfigError } from '@/utils/errors';
import { isValidIndianMobile, normalizeMobile } from '../utils/phoneNormalize';

const CONTACT_SELECT_BASE =
  'id, name, mobile, notes, call_status, last_called_at, last_outcome_notes, synced_to_device, created_at, updated_at';

const CONTACT_SELECT =
  `${CONTACT_SELECT_BASE}, message_status, last_messaged_at, last_message_notes, last_message_kind`;

type ContactRow = Partial<TelecallingContact> &
  Pick<
    TelecallingContact,
    | 'id'
    | 'name'
    | 'mobile'
    | 'notes'
    | 'call_status'
    | 'last_called_at'
    | 'last_outcome_notes'
    | 'synced_to_device'
    | 'created_at'
    | 'updated_at'
  >;

function mapContactRow(row: ContactRow): TelecallingContact {
  return {
    ...row,
    // Includes legacy connected + "called back" note → callback
    call_status: resolveTelecallingStatus(
      row.call_status,
      row.last_outcome_notes
    ),
    message_status: normalizeTeleMessagingStatus(row.message_status),
    last_messaged_at: row.last_messaged_at ?? null,
    last_message_notes: row.last_message_notes ?? null,
    last_message_kind: normalizeTeleMessagingKind(row.last_message_kind),
  };
}

function isMissingMessageColumnError(error: unknown): boolean {
  const lower = getErrorMessage(error).toLowerCase();
  return (
    (lower.includes('message_status') ||
      lower.includes('last_messaged_at') ||
      lower.includes('last_message_notes') ||
      lower.includes('last_message_kind') ||
      lower.includes('telemessaging_message_logs')) &&
    (lower.includes('does not exist') ||
      lower.includes('column') ||
      lower.includes('schema cache'))
  );
}

function mapTelecallingError(error: unknown): Error {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (
    (lower.includes('does not exist') || lower.includes('relation')) &&
    (lower.includes('telecalling_contacts') ||
      lower.includes('telecalling_call_logs'))
  ) {
    return new Error(
      'Tele-calling tables are missing in Supabase. Run supabase/telecalling-migration.sql in the SQL editor.'
    );
  }

  if (isMissingMessageColumnError({ message })) {
    return new Error(
      'Tele-messaging columns are missing in Supabase. Run supabase/telemessaging-migration.sql in the SQL editor.'
    );
  }

  if (
    lower.includes('check constraint') ||
    lower.includes('call_status') ||
    (lower.includes('violates') && lower.includes('check'))
  ) {
    return new Error(
      'Could not save this call outcome. Run supabase/telecalling-callback-migration.sql (or re-run telecalling-migration.sql) so Call Back status is allowed.'
    );
  }

  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('jwt')
  ) {
    return new Error(
      'Could not save tele-calling data. Please sign out, sign in again, and retry.'
    );
  }

  return new Error(message);
}

async function requireSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You are not logged in. Please sign in again and retry.');
  }
}

/**
 * Keep one row per normalized mobile (newest first when ordered desc).
 */
function uniqueByMobile(
  contacts: TelecallingContact[]
): TelecallingContact[] {
  const seen = new Set<string>();
  const unique: TelecallingContact[] = [];
  for (const contact of contacts) {
    const mobile = normalizeMobile(contact.mobile);
    if (!mobile || seen.has(mobile)) continue;
    seen.add(mobile);
    unique.push(
      mobile === contact.mobile ? contact : { ...contact, mobile }
    );
  }
  return unique;
}

export async function fetchTelecallingContacts(): Promise<TelecallingContact[]> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const { data, error } = await supabase
    .from('telecalling_contacts')
    .select(CONTACT_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    // Tele-calling still works before telemessaging-migration.sql is applied.
    if (isMissingMessageColumnError(error)) {
      const fallback = await supabase
        .from('telecalling_contacts')
        .select(CONTACT_SELECT_BASE)
        .order('created_at', { ascending: false });
      if (fallback.error) throw mapTelecallingError(fallback.error);
      return uniqueByMobile(
        ((fallback.data ?? []) as ContactRow[]).map(mapContactRow)
      );
    }
    throw mapTelecallingError(error);
  }
  return uniqueByMobile(((data ?? []) as ContactRow[]).map(mapContactRow));
}

export async function createTelecallingContact(
  input: CreateTelecallingContactInput
): Promise<TelecallingContact> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);
  await requireSession();

  const mobile = normalizeMobile(input.mobile);
  if (!isValidIndianMobile(mobile)) {
    throw new Error('Enter a valid 10-digit Indian mobile number.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('telecalling_contacts')
    .select(CONTACT_SELECT)
    .eq('mobile', mobile)
    .maybeSingle();

  if (existingError) throw mapTelecallingError(existingError);
  if (existing) {
    throw new Error(
      `This mobile number (${mobile}) is already in your tele-calling list.`
    );
  }

  const { data, error } = await supabase
    .from('telecalling_contacts')
    .insert({
      name: input.name.trim() || `Contact ${mobile}`,
      mobile,
      notes: input.notes?.trim() || null,
      synced_to_device: input.synced_to_device ?? false,
      call_status: 'pending',
    })
    .select(CONTACT_SELECT)
    .single();

  if (error) {
    const lower = getErrorMessage(error).toLowerCase();
    if (
      lower.includes('unique') ||
      lower.includes('duplicate') ||
      lower.includes('telecalling_contacts_vendor_mobile')
    ) {
      throw new Error(
        `This mobile number (${mobile}) is already in your tele-calling list.`
      );
    }
    throw mapTelecallingError(error);
  }
  return mapContactRow(data as ContactRow);
}

export interface ImportContactsResult {
  inserted: TelecallingContact[];
  /** Already in DB + duplicates within this batch (after normalize). */
  skippedExisting: number;
}

/**
 * Insert many contacts; skips mobiles already stored for this vendor and
 * dedupes within the batch by normalized 10-digit mobile.
 * Lookups/inserts are chunked so large phonebook imports do not drop rows.
 */
export async function importTelecallingContacts(
  inputs: CreateTelecallingContactInput[]
): Promise<ImportContactsResult> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);
  await requireSession();

  const prepared = inputs
    .map((input) => {
      const mobile = normalizeMobile(input.mobile);
      return {
        name: input.name.trim() || `Contact ${mobile}`,
        mobile,
        notes: input.notes?.trim() || null,
        synced_to_device: input.synced_to_device ?? false,
        call_status: 'pending' as const,
      };
    })
    .filter((row) => isValidIndianMobile(row.mobile));

  if (!prepared.length) {
    return { inserted: [], skippedExisting: 0 };
  }

  const byMobile = new Map<string, (typeof prepared)[number]>();
  let skippedDuplicateInBatch = 0;
  for (const row of prepared) {
    if (byMobile.has(row.mobile)) {
      skippedDuplicateInBatch += 1;
      continue;
    }
    byMobile.set(row.mobile, row);
  }
  const uniqueRows = [...byMobile.values()];

  const mobiles = uniqueRows.map((r) => r.mobile);
  const existingSet = new Set<string>();
  const LOOKUP_CHUNK = 200;
  for (let i = 0; i < mobiles.length; i += LOOKUP_CHUNK) {
    const slice = mobiles.slice(i, i + LOOKUP_CHUNK);
    const { data: existingRows, error: existingError } = await supabase
      .from('telecalling_contacts')
      .select('mobile')
      .in('mobile', slice);

    if (existingError) throw mapTelecallingError(existingError);

    for (const row of existingRows ?? []) {
      const mobile = normalizeMobile((row as { mobile: string }).mobile);
      if (mobile) existingSet.add(mobile);
    }
  }

  const toInsert = uniqueRows.filter((row) => !existingSet.has(row.mobile));
  const skippedAlreadyInDb = uniqueRows.length - toInsert.length;
  const skippedExisting = skippedAlreadyInDb + skippedDuplicateInBatch;

  if (!toInsert.length) {
    return { inserted: [], skippedExisting };
  }

  const inserted: TelecallingContact[] = [];
  const INSERT_CHUNK = 100;

  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    const { data, error } = await supabase
      .from('telecalling_contacts')
      .insert(chunk)
      .select(CONTACT_SELECT);

    if (error) {
      const lower = getErrorMessage(error).toLowerCase();
      if (
        lower.includes('unique') ||
        lower.includes('duplicate') ||
        lower.includes('telecalling_contacts_vendor_mobile')
      ) {
        // Race or partial conflict — insert one-by-one skipping dupes.
        for (const row of chunk) {
          const { data: one, error: oneError } = await supabase
            .from('telecalling_contacts')
            .insert(row)
            .select(CONTACT_SELECT)
            .maybeSingle();
          if (oneError || !one) {
            // Count as skipped existing / race, not a hard failure.
            continue;
          }
          inserted.push(mapContactRow(one as ContactRow));
        }
        continue;
      }
      throw mapTelecallingError(error);
    }

    for (const row of (data ?? []) as ContactRow[]) {
      inserted.push(mapContactRow(row));
    }
  }

  const racedSkips = toInsert.length - inserted.length;
  return {
    inserted,
    skippedExisting: skippedExisting + Math.max(0, racedSkips),
  };
}

/**
 * Append a call log row and update the contact's latest status / notes / timestamp.
 * Contact is never deleted — only call_status / feedback fields change.
 */
export async function recordCallOutcome(
  input: RecordCallOutcomeInput
): Promise<TelecallingContact> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);
  await requireSession();

  const allowed = TELECALLING_OUTCOMES.some((o) => o.value === input.outcome);
  if (!allowed) {
    throw new Error('Invalid call outcome.');
  }

  const notes = input.notes?.trim() || null;
  const calledAt = new Date().toISOString();

  // Update contact first so the list always reflects the latest outcome even if
  // history insert fails (contact is never removed on outcome save).
  const { data, error } = await supabase
    .from('telecalling_contacts')
    .update({
      call_status: input.outcome,
      last_called_at: calledAt,
      last_outcome_notes: notes,
    })
    .eq('id', input.contactId)
    .select(CONTACT_SELECT)
    .single();

  if (error) throw mapTelecallingError(error);

  const { error: logError } = await supabase.from('telecalling_call_logs').insert({
    contact_id: input.contactId,
    outcome: input.outcome,
    notes,
    called_at: calledAt,
  });

  if (logError) {
    // Status already saved — surface a soft warning via thrown message only if critical
    // Prefer keeping the contact visible with updated status.
    console.warn('telecalling_call_logs insert failed', logError);
  }

  return mapContactRow(data as ContactRow);
}

/**
 * Append a message log row and update the contact's latest message status.
 * Does not change call_status or other tele-calling fields.
 */
export async function recordMessageOutcome(
  input: RecordMessageOutcomeInput
): Promise<TelecallingContact> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);
  await requireSession();

  const allowed = TELEMESSAGING_OUTCOMES.some((o) => o.value === input.outcome);
  if (!allowed) {
    throw new Error('Invalid message status.');
  }

  const notes = input.notes?.trim() || null;
  const messagedAt = new Date().toISOString();
  const messageKind = input.messageKind ?? null;

  const { data, error } = await supabase
    .from('telecalling_contacts')
    .update({
      message_status: input.outcome,
      last_messaged_at: messagedAt,
      last_message_notes: notes,
      last_message_kind: messageKind,
    })
    .eq('id', input.contactId)
    .select(CONTACT_SELECT)
    .single();

  if (error) throw mapTelecallingError(error);

  const { error: logError } = await supabase
    .from('telemessaging_message_logs')
    .insert({
      contact_id: input.contactId,
      outcome: input.outcome,
      message_kind: messageKind,
      notes,
      messaged_at: messagedAt,
    });

  if (logError) {
    console.warn('telemessaging_message_logs insert failed', logError);
  }

  return mapContactRow(data as ContactRow);
}

export async function markTelecallingSynced(
  ids: string[],
  synced = true
): Promise<void> {
  if (!ids.length) return;

  const { error } = await supabase
    .from('telecalling_contacts')
    .update({ synced_to_device: synced })
    .in('id', ids);

  if (error) throw mapTelecallingError(error);
}

export async function deleteTelecallingContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('telecalling_contacts')
    .delete()
    .eq('id', id);

  if (error) throw mapTelecallingError(error);
}

/**
 * Delete every tele-calling contact for the signed-in vendor (RLS-scoped).
 * Related call logs are removed via ON DELETE CASCADE.
 * Returns how many contacts were deleted.
 */
export async function deleteAllTelecallingContacts(): Promise<number> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);
  await requireSession();

  const { data: rows, error: listError } = await supabase
    .from('telecalling_contacts')
    .select('id');

  if (listError) throw mapTelecallingError(listError);

  const ids = (rows ?? []).map((row: { id: string }) => row.id);
  if (!ids.length) return 0;

  // Chunk deletes to avoid oversized .in() payloads on large lists.
  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('telecalling_contacts')
      .delete()
      .in('id', chunk);

    if (error) throw mapTelecallingError(error);
  }

  return ids.length;
}

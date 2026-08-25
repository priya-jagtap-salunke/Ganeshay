import { supabase } from '@/lib/supabase';
import {
  CreateTelecallingContactInput,
  RecordCallOutcomeInput,
  TelecallingContact,
  TELECALLING_OUTCOMES,
  normalizeTelecallingStatus,
} from '@/types/telecalling';
import { getErrorMessage, getSupabaseConfigError } from '@/utils/errors';
import { isValidIndianMobile, normalizeMobile } from '../utils/phoneNormalize';

const CONTACT_SELECT =
  'id, name, mobile, notes, call_status, last_called_at, last_outcome_notes, synced_to_device, created_at, updated_at';

function mapContactRow(row: TelecallingContact): TelecallingContact {
  return {
    ...row,
    call_status: normalizeTelecallingStatus(row.call_status),
  };
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

  if (
    lower.includes('check constraint') ||
    lower.includes('call_status') ||
    (lower.includes('violates') && lower.includes('check'))
  ) {
    return new Error(
      'Could not save this call outcome. Re-run supabase/telecalling-migration.sql so call statuses are up to date.'
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

export async function fetchTelecallingContacts(): Promise<TelecallingContact[]> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const { data, error } = await supabase
    .from('telecalling_contacts')
    .select(CONTACT_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw mapTelecallingError(error);
  return ((data ?? []) as TelecallingContact[]).map(mapContactRow);
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

  if (error) throw mapTelecallingError(error);
  return mapContactRow(data as TelecallingContact);
}

export interface ImportContactsResult {
  inserted: TelecallingContact[];
  skippedExisting: number;
}

/**
 * Insert many contacts; skips mobiles already stored for this vendor.
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
  for (const row of prepared) {
    if (!byMobile.has(row.mobile)) {
      byMobile.set(row.mobile, row);
    }
  }
  const uniqueRows = [...byMobile.values()];

  const mobiles = uniqueRows.map((r) => r.mobile);
  const { data: existingRows, error: existingError } = await supabase
    .from('telecalling_contacts')
    .select('mobile')
    .in('mobile', mobiles);

  if (existingError) throw mapTelecallingError(existingError);

  const existingSet = new Set(
    (existingRows ?? []).map((row: { mobile: string }) => row.mobile)
  );
  const toInsert = uniqueRows.filter((row) => !existingSet.has(row.mobile));
  const skippedExisting = uniqueRows.length - toInsert.length;

  if (!toInsert.length) {
    return { inserted: [], skippedExisting };
  }

  const { data, error } = await supabase
    .from('telecalling_contacts')
    .insert(toInsert)
    .select(CONTACT_SELECT);

  if (error) throw mapTelecallingError(error);
  return {
    inserted: ((data ?? []) as TelecallingContact[]).map(mapContactRow),
    skippedExisting,
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

  return mapContactRow(data as TelecallingContact);
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

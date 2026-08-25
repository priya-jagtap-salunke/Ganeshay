import { supabase } from '@/lib/supabase';
import { CreateExpenseInput, Expense } from '@/types/expense';
import { getTodayString } from '@/utils/dates';
import { getErrorMessage, getSupabaseConfigError } from '@/utils/errors';

function mapExpenseError(error: unknown): Error {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes('does not exist') && lower.includes('expenses')) {
    return new Error(
      'Expenses table is missing in Supabase. Run supabase/expenses-migration.sql in the Supabase SQL editor.'
    );
  }

  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('jwt')
  ) {
    return new Error(
      'Could not save expense. Please sign out, sign in again, and retry.'
    );
  }

  return new Error(message);
}

/** Year an expense belongs to (expense_date, falling back to created_at). */
export function getExpenseYear(expense: Expense): number {
  const dateStr = expense.expense_date ?? expense.created_at.slice(0, 10);
  return Number(dateStr.slice(0, 4));
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}

export function filterExpensesByYear(
  expenses: Expense[],
  year: number
): Expense[] {
  return expenses.filter((expense) => getExpenseYear(expense) === year);
}

export async function fetchExpenses(): Promise<Expense[]> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw mapExpenseError(error);
  return (data ?? []) as Expense[];
}

export async function fetchYearExpenses(year: number): Promise<Expense[]> {
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', start)
    .lt('expense_date', end)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw mapExpenseError(error);
  return (data ?? []) as Expense[];
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<Expense> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const title = input.title.trim();
  if (!title) {
    throw new Error('Expense title is required.');
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter a valid expense amount.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You are not logged in. Please sign in again and retry.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      title,
      amount,
      expense_date: input.expense_date?.trim() || getTodayString(),
    })
    .select()
    .single();

  if (error) throw mapExpenseError(error);
  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw mapExpenseError(error);
}

export interface Expense {
  id: string;
  vendor_id?: string;
  title: string;
  amount: number;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  title: string;
  amount: number;
  /** Optional — defaults to today when omitted. */
  expense_date?: string | null;
}

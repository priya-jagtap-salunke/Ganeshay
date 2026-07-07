export function formatCurrency(amount: number): string {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

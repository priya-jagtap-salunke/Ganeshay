import { format, parseISO } from 'date-fns';

export function formatDisplayDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

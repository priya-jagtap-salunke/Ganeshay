import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { CustomerRecord } from '../api/reportsApi';
import { Booking } from '@/types/booking';
import { formatDisplayDate } from '@/utils/dates';

async function saveWorkbook(
  workbook: XLSX.WorkBook,
  filename: string
): Promise<void> {
  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('a');
    anchor.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
    anchor.download = filename;
    anchor.click();
    return;
  }

  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: filename,
    });
  }
}

export async function exportYearBookingsExcel(
  bookings: Booking[],
  year: number
): Promise<void> {
  const sheet = XLSX.utils.aoa_to_sheet([
    [
      'Booking ID',
      'Customer Name',
      'Mobile Number',
      'Booking Date',
      'Murti Name',
      'Total Amount',
      'Advance Paid',
      'Pending Amount',
      'Payment Mode',
      'Status',
      'Notes',
    ],
    ...bookings.map((b) => [
      b.booking_number,
      b.customer_name,
      b.mobile,
      b.booking_date,
      b.murti_name,
      Number(b.price),
      Number(b.advance),
      Number(b.pending),
      b.payment_mode ?? '',
      b.status,
      b.notes ?? '',
    ]),
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, `Bookings ${year}`);

  await saveWorkbook(workbook, `Bappaji_Bookings_${year}.xlsx`);
}

export async function exportCustomerListExcel(
  customers: CustomerRecord[]
): Promise<void> {
  const sheet = XLSX.utils.aoa_to_sheet([
    [
      'Customer Name',
      'Mobile Number',
      'Total Bookings',
      'Total Spent',
      'Last Booking Date',
      'Last Booking ID',
    ],
    ...customers.map((c) => [
      c.customerName,
      c.mobile,
      c.totalBookings,
      c.totalSpent,
      c.lastBookingDate,
      c.lastBookingId,
    ]),
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Customers');

  const date = new Date().toISOString().split('T')[0];
  await saveWorkbook(workbook, `Bappaji_Customers_${date}.xlsx`);
}

export function formatReportDate(dateStr: string): string {
  return formatDisplayDate(dateStr);
}

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

const SAMPLE_FILENAME = 'Import_Contacts_Sample.xlsx';

const SAMPLE_ROWS: string[][] = [
  ['Name', 'Mobile Number'],
  ['Rahul Patil', '9876543210'],
  ['Sneha Sharma', '9123456780'],
  ['Amit Joshi', '9988776655'],
];

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

/** Download/share a sample Excel with Name and Mobile Number columns. */
export async function downloadSampleContactsExcel(): Promise<void> {
  const sheet = XLSX.utils.aoa_to_sheet(SAMPLE_ROWS);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Contacts');
  await saveWorkbook(workbook, SAMPLE_FILENAME);
}

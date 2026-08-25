import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { ParsedExcelContact } from '@/types/telecalling';
import { isValidIndianMobile, normalizeMobile } from './phoneNormalize';

const NAME_HEADERS = new Set([
  'name',
  'customer name',
  'customer name',
  'full name',
  'contact',
  'customer',
  'customername',
  'customer_name',
  'customername',
  'customer_name',
]);

const MOBILE_HEADERS = new Set([
  'mobile',
  'mobile number',
  'mobile no',
  'mobile no.',
  'phone',
  'phone number',
  'phone no',
  'phone no.',
  'contact number',
  'contact no',
  'contact no.',
  'whatsapp',
  'whatsapp number',
  'cell',
  'cellphone',
  'cell phone',
  'mobilenumber',
  'mobile_number',
  'phonenumber',
  'phone_number',
]);

const NOTES_HEADERS = new Set([
  'notes',
  'note',
  'remark',
  'remarks',
  'comment',
  'comments',
  'description',
]);

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Avoid scientific notation for phone numbers stored as numbers
    return String(Math.trunc(value));
  }
  return String(value).trim();
}

function resolveColumnIndexes(headers: string[]): {
  nameIdx: number;
  mobileIdx: number;
  notesIdx: number;
} {
  let nameIdx = -1;
  let mobileIdx = -1;
  let notesIdx = -1;

  headers.forEach((header, index) => {
    if (nameIdx < 0 && NAME_HEADERS.has(header)) nameIdx = index;
    if (mobileIdx < 0 && MOBILE_HEADERS.has(header)) mobileIdx = index;
    if (notesIdx < 0 && NOTES_HEADERS.has(header)) notesIdx = index;
  });

  // Fallback: first column = name, second = mobile when headers are missing/unknown
  if (mobileIdx < 0 && headers.length >= 2) {
    mobileIdx = 1;
  }
  if (nameIdx < 0 && headers.length >= 1) {
    nameIdx = 0;
  }

  return { nameIdx, mobileIdx, notesIdx };
}

export interface ParseExcelResult {
  contacts: ParsedExcelContact[];
  skippedInvalid: number;
  skippedDuplicateInFile: number;
}

/**
 * Parse an Excel/CSV file into tele-calling contacts.
 * Expected columns (flexible headers): Name, Mobile, Notes (optional).
 */
export async function parseTelecallingExcel(
  fileUri: string
): Promise<ParseExcelResult> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const workbook = XLSX.read(base64, { type: 'base64' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The Excel file has no sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!rows.length) {
    throw new Error('The Excel file is empty.');
  }

  const headerRow = (rows[0] ?? []).map(normalizeHeader);
  const looksLikeHeader =
    headerRow.some((h) => NAME_HEADERS.has(h) || MOBILE_HEADERS.has(h)) ||
    headerRow.some((h) => /name|mobile|phone|contact/.test(h));

  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  const { nameIdx, mobileIdx, notesIdx } = resolveColumnIndexes(
    looksLikeHeader ? headerRow : ['name', 'mobile', 'notes']
  );

  if (mobileIdx < 0) {
    throw new Error(
      'Could not find a Mobile / Phone column. Use headers like Name, Mobile, Notes.'
    );
  }

  const seen = new Set<string>();
  const contacts: ParsedExcelContact[] = [];
  let skippedInvalid = 0;
  let skippedDuplicateInFile = 0;

  for (const row of dataRows) {
    if (!Array.isArray(row)) continue;

    const name = cellToString(row[nameIdx >= 0 ? nameIdx : 0]);
    const mobileRaw = cellToString(row[mobileIdx]);
    const notes =
      notesIdx >= 0 ? cellToString(row[notesIdx]) || null : null;

    if (!name && !mobileRaw) continue;

    const mobile = normalizeMobile(mobileRaw);
    if (!isValidIndianMobile(mobile)) {
      skippedInvalid += 1;
      continue;
    }

    if (seen.has(mobile)) {
      skippedDuplicateInFile += 1;
      continue;
    }
    seen.add(mobile);

    contacts.push({
      name: name || `Contact ${mobile}`,
      mobile,
      notes,
    });
  }

  if (!contacts.length) {
    throw new Error(
      'No valid contacts found. Use Name and Mobile columns with 10-digit Indian mobiles.'
    );
  }

  return { contacts, skippedInvalid, skippedDuplicateInFile };
}

export const EXCEL_FORMAT_HINT =
  'Expected columns: Name, Mobile (required), Notes (optional). Header names like Phone, Contact Number, Customer Name also work.';

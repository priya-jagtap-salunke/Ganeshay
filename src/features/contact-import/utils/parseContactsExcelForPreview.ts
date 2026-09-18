import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import {
  ContactImportPreviewRow,
  ContactImportValidationStatus,
  getValidationStatusLabel,
} from '../types';
import {
  isValidIndianMobile,
  normalizeMobile,
} from '@/features/telecalling/utils/phoneNormalize';

const NAME_HEADERS = new Set([
  'name',
  'customer name',
  'full name',
  'contact',
  'customer',
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
    return String(Math.trunc(value));
  }
  return String(value).trim();
}

function resolveColumnIndexes(headers: string[]): {
  nameIdx: number;
  mobileIdx: number;
} {
  let nameIdx = -1;
  let mobileIdx = -1;

  headers.forEach((header, index) => {
    if (nameIdx < 0 && NAME_HEADERS.has(header)) nameIdx = index;
    if (mobileIdx < 0 && MOBILE_HEADERS.has(header)) mobileIdx = index;
  });

  if (mobileIdx < 0 && headers.length >= 2) mobileIdx = 1;
  if (nameIdx < 0 && headers.length >= 1) nameIdx = 0;

  return { nameIdx, mobileIdx };
}

function buildPreviewRow(
  rowNumber: number,
  name: string,
  mobileRaw: string,
  seenMobiles: Set<string>,
  existingMobiles: Set<string>
): ContactImportPreviewRow {
  let validationStatus: ContactImportValidationStatus = 'valid';

  if (!name.trim()) {
    validationStatus = 'empty_name';
  } else if (!mobileRaw.trim()) {
    validationStatus = 'invalid_mobile';
  } else {
    const mobile = normalizeMobile(mobileRaw);
    if (!isValidIndianMobile(mobile)) {
      validationStatus = 'invalid_mobile';
    } else if (seenMobiles.has(mobile)) {
      validationStatus = 'duplicate_in_file';
    } else if (existingMobiles.has(mobile)) {
      validationStatus = 'already_exists';
    } else {
      seenMobiles.add(mobile);
    }
  }

  const mobile =
    mobileRaw.trim() && isValidIndianMobile(normalizeMobile(mobileRaw))
      ? normalizeMobile(mobileRaw)
      : null;

  return {
    rowNumber,
    name,
    mobileRaw,
    mobile,
    validationStatus,
    validationMessage: getValidationStatusLabel(validationStatus),
  };
}

export interface ParseContactsPreviewResult {
  rows: ContactImportPreviewRow[];
  fileName: string;
}

/**
 * Parse Excel rows for preview — keeps every non-empty row with validation status.
 */
export async function parseContactsExcelForPreview(
  fileUri: string,
  fileName: string,
  existingMobiles: Set<string> = new Set()
): Promise<ParseContactsPreviewResult> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const workbook = XLSX.read(base64, { type: 'base64' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The Excel file has no sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!rawRows.length) {
    throw new Error('The Excel file is empty.');
  }

  const headerRow = (rawRows[0] ?? []).map(normalizeHeader);
  const looksLikeHeader =
    headerRow.some((h) => NAME_HEADERS.has(h) || MOBILE_HEADERS.has(h)) ||
    headerRow.some((h) => /name|mobile|phone|contact/.test(h));

  const dataRows = looksLikeHeader ? rawRows.slice(1) : rawRows;
  const { nameIdx, mobileIdx } = resolveColumnIndexes(
    looksLikeHeader ? headerRow : ['name', 'mobile number']
  );

  if (mobileIdx < 0) {
    throw new Error(
      'Could not find a Mobile Number column. Use headers: Name, Mobile Number.'
    );
  }

  const seenMobiles = new Set<string>();
  const rows: ContactImportPreviewRow[] = [];

  dataRows.forEach((row, index) => {
    if (!Array.isArray(row)) return;

    const name = cellToString(row[nameIdx >= 0 ? nameIdx : 0]);
    const mobileRaw = cellToString(row[mobileIdx]);
    if (!name && !mobileRaw) return;

    const excelRowNumber = looksLikeHeader ? index + 2 : index + 1;
    rows.push(
      buildPreviewRow(
        excelRowNumber,
        name,
        mobileRaw,
        seenMobiles,
        existingMobiles
      )
    );
  });

  if (!rows.length) {
    throw new Error('No contact rows found in the Excel file.');
  }

  return { rows, fileName };
}

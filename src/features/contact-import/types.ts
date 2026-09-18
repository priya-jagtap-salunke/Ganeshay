export type ContactImportValidationStatus =
  | 'valid'
  | 'empty_name'
  | 'invalid_mobile'
  | 'duplicate_in_file'
  | 'already_exists';

export interface ContactImportPreviewRow {
  rowNumber: number;
  name: string;
  mobileRaw: string;
  /** Normalized 10-digit mobile when parseable. */
  mobile: string | null;
  validationStatus: ContactImportValidationStatus;
  validationMessage: string;
}

export function isImportablePreviewRow(
  row: ContactImportPreviewRow
): row is ContactImportPreviewRow & { mobile: string } {
  return row.validationStatus === 'valid';
}

export function getValidationStatusLabel(
  status: ContactImportValidationStatus
): string {
  switch (status) {
    case 'valid':
      return 'Valid';
    case 'empty_name':
      return 'Name is empty';
    case 'invalid_mobile':
      return 'Invalid mobile number';
    case 'duplicate_in_file':
      return 'Duplicate in file';
    case 'already_exists':
      return 'Already in contacts';
    default:
      return status;
  }
}

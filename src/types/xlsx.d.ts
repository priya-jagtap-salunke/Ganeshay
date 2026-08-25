declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }

  export type WorkSheet = Record<string, unknown>;

  export const utils: {
    book_new: () => WorkBook;
    aoa_to_sheet: (data: unknown[][]) => WorkSheet;
    book_append_sheet: (
      wb: WorkBook,
      sheet: WorkSheet,
      name: string
    ) => void;
    sheet_to_json: <T = unknown>(
      sheet: WorkSheet,
      opts?: {
        header?: number | string[];
        defval?: unknown;
        raw?: boolean;
      }
    ) => T[];
  };

  export function write(
    wb: WorkBook,
    opts: { type: 'base64'; bookType: 'xlsx' }
  ): string;

  export function read(
    data: string | ArrayBuffer,
    opts?: { type: 'base64' | 'array' | 'binary' | 'string' }
  ): WorkBook;
}

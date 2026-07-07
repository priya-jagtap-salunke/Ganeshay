declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  }

  export const utils: {
    book_new: () => WorkBook;
    aoa_to_sheet: (data: unknown[][]) => unknown;
    book_append_sheet: (
      wb: WorkBook,
      sheet: unknown,
      name: string
    ) => void;
  };

  export function write(
    wb: WorkBook,
    opts: { type: 'base64'; bookType: 'xlsx' }
  ): string;
}

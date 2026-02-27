export interface SpreadsheetColumn<TRow extends object> {
  key: keyof TRow & string;
  header: string;
  required: boolean;
  normalize?: (value: string) => string;
  validate?: (value: string, row: TRow) => string | null;
}

export interface SpreadsheetCellError {
  rowIndex: number;
  columnKey: string;
  message: string;
}

export interface SpreadsheetValidationResult<TRow extends object> {
  normalizedRows: TRow[];
  nonEmptyRows: TRow[];
  validRows: TRow[];
  invalidRows: TRow[];
  cellErrors: SpreadsheetCellError[];
  hasErrors: boolean;
}

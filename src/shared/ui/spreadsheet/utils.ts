import type { CellBase, Matrix } from "react-spreadsheet";
import type {
  SpreadsheetCellError,
  SpreadsheetColumn,
  SpreadsheetValidationResult,
} from "./types";

export type SpreadsheetCell = CellBase<string>;

function toCellValue(cell: SpreadsheetCell | undefined): string {
  if (!cell) return "";
  const value = cell.value;
  return typeof value === "string" ? value : String(value ?? "");
}

export function buildEmptyMatrix(rows: number, columns: number): Matrix<SpreadsheetCell> {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ({ value: "" }))
  );
}

export function matrixToRows<TRow extends object>(
  matrix: Matrix<SpreadsheetCell>,
  columns: SpreadsheetColumn<TRow>[]
): TRow[] {
  return matrix.map((matrixRow) => {
    const row: Record<string, string> = {};
    columns.forEach((column, columnIndex) => {
      row[String(column.key)] = toCellValue(matrixRow[columnIndex]);
    });
    return row as TRow;
  });
}

export function normalizeRows<TRow extends object>(
  rows: TRow[],
  columns: SpreadsheetColumn<TRow>[]
): TRow[] {
  return rows.map((row) => {
    const next: Record<string, string> = {};
    columns.forEach((column) => {
      const raw = (row as Record<string, string | undefined>)[column.key] ?? "";
      const normalized = column.normalize ? column.normalize(raw) : raw.trim();
      next[String(column.key)] = normalized;
    });
    return next as TRow;
  });
}

export function isRowEmpty<TRow extends object>(
  row: TRow,
  columns: SpreadsheetColumn<TRow>[]
): boolean {
  return columns.every(
    (column) =>
      !((row as Record<string, string | undefined>)[column.key] ?? "").trim()
  );
}

export function validateRows<TRow extends object>(
  rows: TRow[],
  columns: SpreadsheetColumn<TRow>[]
): SpreadsheetValidationResult<TRow> {
  const normalizedRows = normalizeRows(rows, columns);
  const nonEmptyRows = normalizedRows.filter((row) => !isRowEmpty(row, columns));
  const cellErrors: SpreadsheetCellError[] = [];

  nonEmptyRows.forEach((row, rowIndex) => {
    columns.forEach((column) => {
      const value = (row as Record<string, string | undefined>)[column.key] ?? "";
      if (column.required && !value.trim()) {
        cellErrors.push({
          rowIndex,
          columnKey: String(column.key),
          message: `${column.header} es obligatorio.`,
        });
        return;
      }
      if (column.validate) {
        const message = column.validate(value, row);
        if (message) {
          cellErrors.push({
            rowIndex,
            columnKey: String(column.key),
            message,
          });
        }
      }
    });
  });

  const invalidRowIndexes = new Set(cellErrors.map((error) => error.rowIndex));
  const validRows = nonEmptyRows.filter((_, rowIndex) => !invalidRowIndexes.has(rowIndex));
  const invalidRows = nonEmptyRows.filter((_, rowIndex) => invalidRowIndexes.has(rowIndex));

  return {
    normalizedRows,
    nonEmptyRows,
    validRows,
    invalidRows,
    cellErrors,
    hasErrors: cellErrors.length > 0,
  };
}

function escapeCsvValue(value: string): string {
  const escaped = value.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const rowLines = rows.map((row) => row.map(escapeCsvValue).join(","));
  return [headerLine, ...rowLines].join("\n");
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.setAttribute("download", filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

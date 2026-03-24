import * as XLSX from "xlsx";
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

/* ── Excel helpers ── */

export function buildExcelBuffer(headers: string[], rows: string[][]): ArrayBuffer {
  const aoa = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export function downloadExcel(filename: string, buffer: ArrayBuffer): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.setAttribute("download", filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function parseExcelFile(file: File, columnCount: number): Promise<string[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return [];
  const raw = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
  // Skip the header row (first row) and pad/trim each row to columnCount
  const dataRows = raw.slice(1).map((row) => {
    const padded = Array.from({ length: columnCount }, (_, i) =>
      String(row[i] ?? "")
    );
    return padded;
  });
  return dataRows;
}

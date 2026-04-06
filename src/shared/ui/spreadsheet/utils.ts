import ExcelJS from "exceljs";
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

function toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  }

  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy.buffer;
}

function spreadsheetValueToString(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((entry) => spreadsheetValueToString(entry)).join("");
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
    if ("result" in value) return spreadsheetValueToString(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((entry) => entry.text).join("");
    }
    if ("formula" in value && typeof value.formula === "string") return value.formula;
  }
  return "";
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

export async function buildExcelBuffer(
  headers: string[],
  rows: string[][]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Datos");

  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return toArrayBuffer(buffer);
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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) return [];

  return Array.from({ length: Math.max(worksheet.rowCount - 1, 0) }, (_, rowIndex) => {
    const row = worksheet.getRow(rowIndex + 2);
    return Array.from({ length: columnCount }, (_, columnIndex) =>
      spreadsheetValueToString(row.getCell(columnIndex + 1).value)
    );
  });
}

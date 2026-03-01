"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Matrix } from "react-spreadsheet";
import type { SpreadsheetColumn, SpreadsheetValidationResult } from "./types";
import {
  buildEmptyMatrix,
  buildExcelBuffer,
  downloadExcel,
  matrixToRows,
  parseExcelFile,
  type SpreadsheetCell,
  validateRows,
} from "./utils";

// ─── Tipos públicos del hook ──────────────────────────────────────────────────

export interface UseSpreadsheetEditorOptions<TRow extends object> {
  columns: SpreadsheetColumn<TRow>[];
  entityLabel: string;
  maxRows: number;
  initialRows: number;
  submitting: boolean;
  onSubmit: (rows: TRow[]) => Promise<void>;
  onRowsValidated?: (result: SpreadsheetValidationResult<TRow>) => void;
}

export interface UseSpreadsheetEditorReturn<TRow extends object> {
  // Estado de la grilla
  data: Matrix<SpreadsheetCell>;
  setData: React.Dispatch<React.SetStateAction<Matrix<SpreadsheetCell>>>;
  // Refs
  gridRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  // Validación derivada
  validation: SpreadsheetValidationResult<TRow>;
  // Flags de control
  canAddRow: boolean;
  canRemoveRow: boolean;
  submitDisabled: boolean;
  // Handlers
  handleAddRow: () => void;
  handleRemoveRow: () => void;
  handleDownloadTemplate: () => void;
  handleImportExcel: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSubmit: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Encapsula el estado completo, efectos y handlers del SpreadsheetBatchEditor.
 * El componente solo necesita consumir este hook y renderizar las piezas.
 */
export function useSpreadsheetEditor<TRow extends object>({
  columns,
  entityLabel,
  maxRows,
  initialRows,
  submitting,
  onSubmit,
  onRowsValidated,
}: UseSpreadsheetEditorOptions<TRow>): UseSpreadsheetEditorReturn<TRow> {
  const [data, setData] = useState<Matrix<SpreadsheetCell>>(() =>
    buildEmptyMatrix(Math.min(initialRows, maxRows), columns.length)
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validación reactiva ─────────────────────────────────────────────────────
  const validation = useMemo(() => {
    const rows = matrixToRows(data, columns);
    return validateRows(rows, columns);
  }, [columns, data]);

  useEffect(() => {
    onRowsValidated?.(validation);
  }, [onRowsValidated, validation]);

  // ── Flags ───────────────────────────────────────────────────────────────────
  const canAddRow = data.length < maxRows;
  const canRemoveRow = data.length > 1;
  const submitDisabled =
    submitting || validation.nonEmptyRows.length === 0 || validation.hasErrors;

  // ── Handlers de filas ───────────────────────────────────────────────────────
  const handleAddRow = useCallback(() => {
    if (data.length >= maxRows) return;
    setData((prev) => [...prev, ...buildEmptyMatrix(1, columns.length)]);
  }, [columns.length, data.length, maxRows]);

  const handleRemoveRow = useCallback(() => {
    if (data.length <= 1) return;
    setData((prev) => prev.slice(0, -1));
  }, [data.length]);

  // ── Excel ───────────────────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const buffer = buildExcelBuffer(
      columns.map((col) => col.header),
      []
    );
    downloadExcel(`${entityLabel.toLowerCase()}-plantilla.xlsx`, buffer);
  };

  const handleImportExcel = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const importedRows = await parseExcelFile(file, columns.length);
      if (importedRows.length === 0) return;
      const trimmed = importedRows.slice(0, maxRows);
      const newMatrix: Matrix<SpreadsheetCell> = trimmed.map((row) =>
        row.map((value) => ({ value }))
      );
      setData(newMatrix);
    } catch {
      // Fichero inválido: no hace nada, la grilla queda igual
    } finally {
      // Permite reimportar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Envío ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitDisabled) return;
    await onSubmit(validation.validRows);
  };

  // ── Atajos de teclado ───────────────────────────────────────────────────────
  useEffect(() => {
    const container = gridRef.current;
    if (!container) return;

    /** Celda actualmente seleccionada en la grilla. */
    const getActiveCell = (): HTMLTableCellElement | null =>
      container.querySelector(
        "td.Spreadsheet__cell--selected, td[class*='selected']"
      );

    /** ¿La celda pertenece a la última fila del tbody? */
    const isOnLastRow = (cell: HTMLTableCellElement): boolean => {
      const row = cell.closest("tr");
      const tbody = row?.closest("tbody");
      if (!row || !tbody) return false;
      const allRows = Array.from(tbody.querySelectorAll("tr"));
      return allRows.indexOf(row) === allRows.length - 1;
    };

    /** ¿La celda es la última de su fila? */
    const isOnLastCell = (cell: HTMLTableCellElement): boolean => {
      const row = cell.closest("tr");
      if (!row) return false;
      const cells = Array.from(row.querySelectorAll("td"));
      return cells.indexOf(cell) === cells.length - 1;
    };

    const appendRow = () =>
      setData((prev) => [...prev, ...buildEmptyMatrix(1, columns.length)]);

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter en última fila → nueva fila
      if (
        event.key === "Enter" &&
        event.ctrlKey &&
        !event.shiftKey &&
        !event.metaKey
      ) {
        const active = getActiveCell();
        if (active && isOnLastRow(active) && data.length < maxRows) {
          event.preventDefault();
          appendRow();
        }
        return;
      }

      // Tab en última celda de última fila → nueva fila
      if (event.key === "Tab" && !event.shiftKey) {
        const active = getActiveCell();
        if (
          active &&
          isOnLastRow(active) &&
          isOnLastCell(active) &&
          data.length < maxRows
        ) {
          event.preventDefault();
          appendRow();
        }
        return;
      }

      // Ctrl+Supr → quita última fila
      if (event.key === "Delete" && event.ctrlKey && data.length > 1) {
        event.preventDefault();
        setData((prev) => prev.slice(0, -1));
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [columns.length, data.length, maxRows]);

  return {
    data,
    setData,
    gridRef,
    fileInputRef,
    validation,
    canAddRow,
    canRemoveRow,
    submitDisabled,
    handleAddRow,
    handleRemoveRow,
    handleDownloadTemplate,
    handleImportExcel,
    handleSubmit,
  };
}

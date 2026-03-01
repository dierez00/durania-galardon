"use client";

import Spreadsheet from "react-spreadsheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import type { SpreadsheetColumn, SpreadsheetValidationResult } from "./types";
import { useSpreadsheetEditor } from "./useSpreadsheetEditor";
import { SpreadsheetToolbar } from "./SpreadsheetToolbar";
import { SpreadsheetStats } from "./SpreadsheetStats";
import { SpreadsheetErrorTable } from "./SpreadsheetErrorTable";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpreadsheetBatchEditorProps<TRow extends object> {
  columns: SpreadsheetColumn<TRow>[];
  entityLabel: string;
  maxRows?: number;
  initialRows?: number;
  submitLabel?: string;
  submitting?: boolean;
  externalError?: string;
  onSubmit: (rows: TRow[]) => Promise<void>;
  onRowsValidated?: (result: SpreadsheetValidationResult<TRow>) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Editor de carga masiva por grilla. Orquesta:
 *  - useSpreadsheetEditor  → estado, validación, handlers y atajos de teclado
 *  - SpreadsheetToolbar    → botones de plantilla / importar / filas
 *  - SpreadsheetStats      → badges de resumen
 *  - SpreadsheetErrorTable → tabla de errores de validación
 */
export function SpreadsheetBatchEditor<TRow extends object>({
  columns,
  entityLabel,
  maxRows = 100,
  initialRows = 10,
  submitLabel = "Enviar lote",
  submitting = false,
  externalError = "",
  onSubmit,
  onRowsValidated,
}: Readonly<SpreadsheetBatchEditorProps<TRow>>) {
  const {
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
  } = useSpreadsheetEditor({
    columns,
    entityLabel,
    maxRows,
    initialRows,
    submitting,
    onSubmit,
    onRowsValidated,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga masiva de {entityLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SpreadsheetToolbar
          fileInputRef={fileInputRef}
          canAddRow={canAddRow}
          canRemoveRow={canRemoveRow}
          onDownloadTemplate={handleDownloadTemplate}
          onImportExcel={handleImportExcel}
          onAddRow={handleAddRow}
          onRemoveRow={handleRemoveRow}
        />

        <SpreadsheetStats
          totalRows={data.length}
          nonEmptyRows={validation.nonEmptyRows.length}
          validRows={validation.validRows.length}
          invalidRows={validation.invalidRows.length}
        />

        <div
          ref={gridRef}
          className="w-full min-w-0 overflow-x-auto rounded-md border p-2 [&_table]:w-full [&_table]:table-fixed [&_td]:min-w-28 [&_th]:min-w-28"
        >
          <Spreadsheet
            data={data}
            onChange={setData}
            columnLabels={columns.map((col) => col.header)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Ctrl+Enter en ultima fila = nueva fila · Tab avanza · Ctrl+Supr quita
          ultima fila
        </p>

        <SpreadsheetErrorTable errors={validation.cellErrors} />

        {externalError ? (
          <p className="text-sm text-destructive">{externalError}</p>
        ) : null}

        <Button onClick={handleSubmit} disabled={submitDisabled}>
          {submitting ? "Procesando..." : submitLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

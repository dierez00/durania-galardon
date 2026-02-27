"use client";

import { useEffect, useMemo, useState } from "react";
import Spreadsheet from "react-spreadsheet";
import type { Matrix } from "react-spreadsheet";
import { Download, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { SpreadsheetColumn, SpreadsheetValidationResult } from "./types";
import {
  buildCsv,
  buildEmptyMatrix,
  downloadCsv,
  matrixToRows,
  type SpreadsheetCell,
  validateRows,
} from "./utils";

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
  const [data, setData] = useState<Matrix<SpreadsheetCell>>(() =>
    buildEmptyMatrix(Math.min(initialRows, maxRows), columns.length)
  );

  const validation = useMemo(() => {
    const rows = matrixToRows(data, columns);
    return validateRows(rows, columns);
  }, [columns, data]);

  useEffect(() => {
    onRowsValidated?.(validation);
  }, [onRowsValidated, validation]);

  const canAddRow = data.length < maxRows;
  const canRemoveRow = data.length > 1;
  const submitDisabled =
    submitting || validation.nonEmptyRows.length === 0 || validation.hasErrors;

  const handleAddRow = () => {
    if (!canAddRow) return;
    setData((current) => [...current, ...buildEmptyMatrix(1, columns.length)]);
  };

  const handleRemoveRow = () => {
    if (!canRemoveRow) return;
    setData((current) => current.slice(0, current.length - 1));
  };

  const handleDownloadTemplate = () => {
    const csv = buildCsv(
      columns.map((column) => column.header),
      []
    );
    downloadCsv(`${entityLabel.toLowerCase()}-template.csv`, csv);
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;
    await onSubmit(validation.validRows);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Carga masiva de {entityLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4" />
            Descargar plantilla CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddRow} disabled={!canAddRow}>
            <Plus className="h-4 w-4" />
            Agregar fila
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveRow}
            disabled={!canRemoveRow}
          >
            <Trash2 className="h-4 w-4" />
            Quitar ultima fila
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Filas tabla: {data.length}</Badge>
          <Badge variant="secondary">Con datos: {validation.nonEmptyRows.length}</Badge>
          <Badge variant="secondary">Validas: {validation.validRows.length}</Badge>
          <Badge variant={validation.invalidRows.length > 0 ? "destructive" : "secondary"}>
            Invalidas: {validation.invalidRows.length}
          </Badge>
        </div>

        <div className="overflow-x-auto rounded-md border p-2">
          <Spreadsheet data={data} onChange={setData} columnLabels={columns.map((column) => column.header)} />
        </div>

        {validation.cellErrors.length > 0 && (
          <div className="rounded-md border border-destructive/40 p-3">
            <p className="mb-2 text-sm font-medium text-destructive">
              Corrige los errores antes de enviar:
            </p>
            <div className="max-h-48 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>Columna</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validation.cellErrors.map((error) => (
                    <TableRow key={`${error.rowIndex}-${error.columnKey}-${error.message}`}>
                      <TableCell>{error.rowIndex + 1}</TableCell>
                      <TableCell>{error.columnKey}</TableCell>
                      <TableCell>{error.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

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

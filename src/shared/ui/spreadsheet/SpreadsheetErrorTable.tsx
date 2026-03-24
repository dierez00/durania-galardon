"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { SpreadsheetCellError } from "./types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpreadsheetErrorTableProps {
  errors: SpreadsheetCellError[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Tabla de errores de validación de la grilla.
 * Muestra fila, columna y mensaje de error por cada celda inválida.
 * Se oculta automáticamente cuando no hay errores.
 */
export const SpreadsheetErrorTable: React.FC<SpreadsheetErrorTableProps> = ({
  errors,
}) => {
  if (errors.length === 0) return null;

  return (
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
            {errors.map((error) => (
              <TableRow
                key={`${error.rowIndex}-${error.columnKey}-${error.message}`}
              >
                <TableCell>{error.rowIndex + 1}</TableCell>
                <TableCell>{error.columnKey}</TableCell>
                <TableCell>{error.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

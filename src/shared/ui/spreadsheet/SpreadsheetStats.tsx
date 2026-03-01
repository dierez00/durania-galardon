"use client";

import React from "react";
import { Badge } from "@/shared/ui/badge";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpreadsheetStatsProps {
  totalRows: number;
  nonEmptyRows: number;
  validRows: number;
  invalidRows: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Fila de badges con un resumen en tiempo real del estado de la grilla:
 * filas totales, con datos, válidas e inválidas.
 * El badge de invalidas cambia a destructive cuando hay errores.
 */
export const SpreadsheetStats: React.FC<SpreadsheetStatsProps> = ({
  totalRows,
  nonEmptyRows,
  validRows,
  invalidRows,
}) => (
  <div className="flex flex-wrap gap-2">
    <Badge variant="secondary">Filas tabla: {totalRows}</Badge>
    <Badge variant="secondary">Con datos: {nonEmptyRows}</Badge>
    <Badge variant="secondary">Validas: {validRows}</Badge>
    <Badge variant={invalidRows > 0 ? "destructive" : "secondary"}>
      Invalidas: {invalidRows}
    </Badge>
  </div>
);

"use client";

import React from "react";
import { Download, FileUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpreadsheetToolbarProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  canAddRow: boolean;
  canRemoveRow: boolean;
  onDownloadTemplate: () => Promise<void>;
  onImportExcel: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddRow: () => void;
  onRemoveRow: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Barra de herramientas del editor de grilla.
 * Contiene: descargar plantilla, importar Excel, agregar fila, quitar fila.
 * El input de archivo oculto vive aquí para mantener la lógica de importación
 * junto a su botón disparador.
 */
export const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  fileInputRef,
  canAddRow,
  canRemoveRow,
  onDownloadTemplate,
  onImportExcel,
  onAddRow,
  onRemoveRow,
}) => (
  <div className="flex flex-wrap gap-2">
    <Button variant="outline" size="sm" onClick={onDownloadTemplate}>
      <Download className="h-4 w-4" />
      Descargar plantilla Excel
    </Button>

    <Button
      variant="outline"
      size="sm"
      onClick={() => fileInputRef.current?.click()}
    >
      <FileUp className="h-4 w-4" />
      Importar Excel
    </Button>

    {/* Input oculto — activado por el botón de arriba */}
    <input
      ref={fileInputRef}
      type="file"
      accept=".xlsx"
      className="hidden"
      onChange={onImportExcel}
    />

    <Button
      variant="outline"
      size="sm"
      onClick={onAddRow}
      disabled={!canAddRow}
    >
      <Plus className="h-4 w-4" />
      Agregar fila
    </Button>

    <Button
      variant="outline"
      size="sm"
      onClick={onRemoveRow}
      disabled={!canRemoveRow}
    >
      <Trash2 className="h-4 w-4" />
      Quitar ultima fila
    </Button>
  </div>
);

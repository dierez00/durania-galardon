// ─── Componente principal ─────────────────────────────────────────────────────
export { SpreadsheetBatchEditor } from "./SpreadsheetBatchEditor";

// ─── Sub-componentes (reutilizables independientemente) ───────────────────────
export { SpreadsheetToolbar } from "./SpreadsheetToolbar";
export { SpreadsheetStats } from "./SpreadsheetStats";
export { SpreadsheetErrorTable } from "./SpreadsheetErrorTable";

// ─── Hook ─────────────────────────────────────────────────────────────────────
export { useSpreadsheetEditor } from "./useSpreadsheetEditor";
export type {
  UseSpreadsheetEditorOptions,
  UseSpreadsheetEditorReturn,
} from "./useSpreadsheetEditor";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type {
  SpreadsheetColumn,
  SpreadsheetCellError,
  SpreadsheetValidationResult,
} from "./types";

// ─── Utilidades ───────────────────────────────────────────────────────────────
export { buildExcelBuffer, downloadExcel, parseExcelFile } from "./utils";

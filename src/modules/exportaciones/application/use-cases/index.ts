import type { Exportacion, ExportacionesFiltersState } from "../../domain/entities/ExportacionesEntity";
import type { ExportacionesRepository } from "../../domain/repositories/exportacionesRepository";
import { filterExportaciones } from "../../domain/services/filterExportaciones";

export function listExportaciones(repo: ExportacionesRepository): Exportacion[] {
  return repo.list();
}

export function filterExportacionesUseCase(
  exportaciones: Exportacion[],
  filters: ExportacionesFiltersState
): Exportacion[] {
  return filterExportaciones(exportaciones, filters);
}


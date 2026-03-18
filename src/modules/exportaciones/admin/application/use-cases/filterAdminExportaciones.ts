import type { AdminExportacion, AdminExportacionesFiltersState } from "../../domain/entities/AdminExportacionEntity";

export function filterAdminExportaciones(
  exportaciones: AdminExportacion[],
  filters: AdminExportacionesFiltersState
): AdminExportacion[] {
  return exportaciones.filter((e) => {
    const search = filters.search.toLowerCase();
    const matchesSearch = !search || (e.upp_id ?? "").toLowerCase().includes(search);
    const matchesStatus = !filters.status || e.status === filters.status;
    return matchesSearch && matchesStatus;
  });
}

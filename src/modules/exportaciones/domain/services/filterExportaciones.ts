import type { Exportacion, ExportacionesFiltersState } from "../entities/ExportacionesEntity";

export function filterExportaciones(
  exportaciones: Exportacion[],
  filters: ExportacionesFiltersState
): Exportacion[] {
  return exportaciones.filter((e) => {
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const match =
        e.arete.toLowerCase().includes(search) ||
        e.productor.toLowerCase().includes(search) ||
        e.rancho.toLowerCase().includes(search) ||
        e.mvz.toLowerCase().includes(search);
      if (!match) return false;
    }

    if (filters.estado && e.estado !== filters.estado) return false;
    if (filters.reactor && e.reactor !== filters.reactor) return false;
    if (filters.fechaDesde && e.prueba < filters.fechaDesde) return false;
    if (filters.fechaHasta && e.prueba > filters.fechaHasta) return false;

    return true;
  });
}

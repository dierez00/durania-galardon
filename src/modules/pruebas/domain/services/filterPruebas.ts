import type { PruebaSanitaria, PruebasFiltersState } from "../entities/PruebasEntity";

export function filterPruebas(
  pruebas: PruebaSanitaria[],
  filters: PruebasFiltersState
): PruebaSanitaria[] {
  return pruebas.filter((p) => {
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const match =
        p.mvz.toLowerCase().includes(search) ||
        p.lugar.toLowerCase().includes(search) ||
        p.motivo.toLowerCase().includes(search) ||
        p.supervisor.toLowerCase().includes(search);
      if (!match) return false;
    }

    if (filters.motivo && p.motivo !== filters.motivo) return false;
    if (filters.estado && p.estado !== filters.estado) return false;
    if (filters.fechaDesde && p.fecha < filters.fechaDesde) return false;
    if (filters.fechaHasta && p.fecha > filters.fechaHasta) return false;

    return true;
  });
}

import type { Rancho, RanchosFiltersState } from "../entities/RanchosEntity";

export function filterRanchos(
  ranchos: Rancho[],
  filters: RanchosFiltersState
): Rancho[] {
  return ranchos.filter((r) => {
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const match =
        r.nombre.toLowerCase().includes(search) ||
        r.productor.toLowerCase().includes(search) ||
        r.municipio.toLowerCase().includes(search);
      if (!match) return false;
    }

    if (filters.municipio && r.municipio !== filters.municipio) return false;
    if (filters.estado && r.estado !== filters.estado) return false;
    if (filters.fechaDesde && r.fechaRegistro < filters.fechaDesde) return false;
    if (filters.fechaHasta && r.fechaRegistro > filters.fechaHasta) return false;

    return true;
  });
}

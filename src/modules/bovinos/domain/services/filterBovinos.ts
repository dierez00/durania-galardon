import type { Bovino, BovinosFiltersState } from "../entities/Bovino";

export function filterBovinos(
  bovinos: Bovino[],
  filters: BovinosFiltersState
): Bovino[] {
  return bovinos.filter((b) => {
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const match =
        b.arete.toLowerCase().includes(search) ||
        b.raza.toLowerCase().includes(search) ||
        b.rancho.toLowerCase().includes(search) ||
        b.productor.toLowerCase().includes(search);
      if (!match) return false;
    }

    if (filters.sexo && b.sexo !== filters.sexo) return false;
    if (filters.sanitario && b.sanitario !== filters.sanitario) return false;
    if (filters.fechaDesde && b.nacimiento < filters.fechaDesde) return false;
    if (filters.fechaHasta && b.nacimiento > filters.fechaHasta) return false;

    return true;
  });
}

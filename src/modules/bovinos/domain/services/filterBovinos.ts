import type { Bovino, BovinosFiltersState } from "../entities/Bovino";

export function filterBovinos(
  bovinos: Bovino[],
  filters: BovinosFiltersState
): Bovino[] {
  return bovinos.filter((b) => {
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const match =
        b.siniiga_tag.toLowerCase().includes(search) ||
        (b.name ?? "").toLowerCase().includes(search) ||
        (b.breed ?? "").toLowerCase().includes(search) ||
        (b.current_collar_id ?? "").toLowerCase().includes(search) ||
        b.upp_name.toLowerCase().includes(search) ||
        (b.upp_code ?? "").toLowerCase().includes(search);
      if (!match) return false;
    }

    if (filters.sexo && b.sex !== filters.sexo) return false;

    if (filters.sanitario) {
      if (b.sanitary.sanitary_alert !== filters.sanitario) return false;
    }

    if (filters.exportable) {
      if (filters.exportable === "apto" && !b.canExport) return false;
      if (filters.exportable === "no_apto" && b.canExport) return false;
    }

    if (filters.fechaDesde && b.birth_date && b.birth_date < filters.fechaDesde)
      return false;
    if (filters.fechaHasta && b.birth_date && b.birth_date > filters.fechaHasta)
      return false;

    return true;
  });
}

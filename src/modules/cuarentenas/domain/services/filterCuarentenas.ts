import type { Cuarentena, CuarentenasFiltersState } from "../entities/CuarentenasEntity";

export function filterCuarentenas(
  cuarentenas: Cuarentena[],
  filters: CuarentenasFiltersState
): Cuarentena[] {
  return cuarentenas.filter((c) => {
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const match =
        c.bovino.toLowerCase().includes(search) ||
        c.rancho.toLowerCase().includes(search) ||
        c.mvz.toLowerCase().includes(search);
      if (!match) return false;
    }

    if (filters.estado && c.estado !== filters.estado) return false;
    if (filters.fechaDesde && c.inicio < filters.fechaDesde) return false;
    if (filters.fechaHasta && c.inicio > filters.fechaHasta) return false;

    return true;
  });
}

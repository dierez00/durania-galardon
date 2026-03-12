import type { Productor, ProductoresFiltersState } from "../entities/ProductoresEntity";

export function filterProductores(
  productores: Productor[],
  filters: ProductoresFiltersState
): Productor[] {
  return productores.filter((p) => {
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const match =
        p.nombre.toLowerCase().includes(search) ||
        p.curp.toLowerCase().includes(search) ||
        p.municipio.toLowerCase().includes(search);
      if (!match) return false;
    }

    if (filters.municipio && p.municipio !== filters.municipio) return false;
    if (filters.estado && p.estado !== filters.estado) return false;
    if (filters.fechaDesde && p.fechaRegistro < filters.fechaDesde) return false;
    if (filters.fechaHasta && p.fechaRegistro > filters.fechaHasta) return false;

    return true;
  });
}

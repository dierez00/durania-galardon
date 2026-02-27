import type { AdminProductor, AdminProductoresFiltersState } from "../../domain/entities/AdminProductorEntity";

export function filterAdminProductores(
  productores: AdminProductor[],
  filters: AdminProductoresFiltersState
): AdminProductor[] {
  return productores.filter((p) => {
    const search = filters.search.toLowerCase();
    const matchesSearch =
      !search ||
      p.full_name.toLowerCase().includes(search) ||
      (p.curp ?? "").toLowerCase().includes(search);
    const matchesStatus = !filters.status || p.status === filters.status;
    return matchesSearch && matchesStatus;
  });
}

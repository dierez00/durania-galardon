import type { Cita, CitasFiltersState } from "../../domain/entities/CitaEntity";

export function filterCitas(citas: Cita[], filters: CitasFiltersState): Cita[] {
  return citas.filter((c) => {
    const search = filters.search.toLowerCase();
    const matchesSearch =
      !search ||
      c.full_name.toLowerCase().includes(search) ||
      c.requested_service.toLowerCase().includes(search) ||
      (c.email ?? "").toLowerCase().includes(search);
    const matchesStatus = !filters.status || c.status === filters.status;
    return matchesSearch && matchesStatus;
  });
}

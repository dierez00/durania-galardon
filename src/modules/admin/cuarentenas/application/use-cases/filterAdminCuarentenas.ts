import type { AdminCuarentena, AdminCuarentenasFiltersState } from "../../domain/entities/AdminCuarentenaEntity";

export function filterAdminCuarentenas(
  cuarentenas: AdminCuarentena[],
  filters: AdminCuarentenasFiltersState
): AdminCuarentena[] {
  return cuarentenas.filter((c) => {
    const search = filters.search.toLowerCase();
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search) ||
      (c.upp_id ?? "").toLowerCase().includes(search);
    const matchesStatus = !filters.status || c.status === filters.status;
    const matchesType = !filters.quarantine_type || c.quarantine_type === filters.quarantine_type;
    return matchesSearch && matchesStatus && matchesType;
  });
}

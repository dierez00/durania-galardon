import type { AdminMvz, AdminMvzFiltersState } from "../../domain/entities/AdminMvzEntity";

export function filterAdminMvz(mvzList: AdminMvz[], filters: AdminMvzFiltersState): AdminMvz[] {
  return mvzList.filter((m) => {
    const search = filters.search.toLowerCase();
    const matchesSearch =
      !search ||
      m.full_name.toLowerCase().includes(search) ||
      m.license_number.toLowerCase().includes(search);
    const matchesStatus = !filters.status || m.status === filters.status;
    return matchesSearch && matchesStatus;
  });
}

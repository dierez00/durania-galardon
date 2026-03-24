import type { AuditoriaLog, AuditoriaFiltersState } from "../../domain/entities/AuditoriaLogEntity";

export function filterAuditoriaLogs(
  logs: AuditoriaLog[],
  filters: AuditoriaFiltersState
): AuditoriaLog[] {
  return logs.filter((log) => {
    const search = filters.search.toLowerCase();
    const matchesSearch =
      !search ||
      (log.actor_user_id ?? "").toLowerCase().includes(search) ||
      log.resource.toLowerCase().includes(search) ||
      (log.resource_id ?? "").toLowerCase().includes(search);
    const matchesAction = !filters.action || log.action === filters.action;
    const matchesResource = !filters.resource || log.resource === filters.resource;
    return matchesSearch && matchesAction && matchesResource;
  });
}

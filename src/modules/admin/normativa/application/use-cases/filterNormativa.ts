import type { NormativaSetting, NormativaFiltersState } from "../../domain/entities/NormativaSettingEntity";

export function filterNormativa(
  settings: NormativaSetting[],
  filters: NormativaFiltersState
): NormativaSetting[] {
  return settings.filter((s) => {
    const search = filters.search.toLowerCase();
    const matchesSearch = !search || s.key.toLowerCase().includes(search);
    const matchesStatus = !filters.status || s.status === filters.status;
    return matchesSearch && matchesStatus;
  });
}

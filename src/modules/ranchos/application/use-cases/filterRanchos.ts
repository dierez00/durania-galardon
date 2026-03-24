import type { Rancho, RanchosFiltersState } from "../../domain/entities/RanchosEntity";
import { filterRanchos } from "../../domain/services/filterRanchos";

export function filterRanchosUseCase(
  ranchos: Rancho[],
  filters: RanchosFiltersState
): Rancho[] {
  return filterRanchos(ranchos, filters);
}

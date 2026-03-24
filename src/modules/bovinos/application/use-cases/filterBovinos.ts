import type { Bovino, BovinosFiltersState } from "../../domain/entities/Bovino";
import { filterBovinos } from "../../domain/services/filterBovinos";

export function filterBovinosUseCase(
  bovinos: Bovino[],
  filters: BovinosFiltersState
): Bovino[] {
  return filterBovinos(bovinos, filters);
}

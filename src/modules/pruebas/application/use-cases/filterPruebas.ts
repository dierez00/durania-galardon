import type { PruebaSanitaria, PruebasFiltersState } from "../../domain/entities/PruebasEntity";
import { filterPruebas } from "../../domain/services/filterPruebas";

export function filterPruebasUseCase(
  pruebas: PruebaSanitaria[],
  filters: PruebasFiltersState
): PruebaSanitaria[] {
  return filterPruebas(pruebas, filters);
}

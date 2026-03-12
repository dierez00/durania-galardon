import type { Productor, ProductoresFiltersState } from "../../domain/entities/ProductoresEntity";
import { filterProductores } from "../../domain/services/filterProductores";

export function filterProductoresUseCase(
  productores: Productor[],
  filters: ProductoresFiltersState
): Productor[] {
  return filterProductores(productores, filters);
}

import type { Productor } from "../../domain/entities/ProductoresEntity";
import type { ProductoresRepository } from "../../domain/repositories/productoresRepository";

export function listProductores(repository: ProductoresRepository): Productor[] {
  return repository.list();
}

import type { PruebaSanitaria } from "../../domain/entities/PruebasEntity";
import type { PruebasRepository } from "../../domain/repositories/pruebasRepository";

export function listPruebas(repository: PruebasRepository): PruebaSanitaria[] {
  return repository.list();
}

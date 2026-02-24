import type { Bovino } from "../../domain/entities/Bovino";
import type { BovinoRepository } from "../../domain/repositories/BovinoRepository";

export function listBovinos(repository: BovinoRepository): Bovino[] {
  return repository.list();
}

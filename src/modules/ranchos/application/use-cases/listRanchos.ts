import type { Rancho } from "../../domain/entities/RanchosEntity";
import type { RanchosRepository } from "../../domain/repositories/ranchosRepository";

export function listRanchos(repository: RanchosRepository): Rancho[] {
  return repository.list();
}

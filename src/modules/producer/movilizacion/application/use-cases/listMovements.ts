import type { Movement } from "../../domain/entities/Movement";
import type { MovementRepository } from "../../domain/repositories/MovementRepository";

export class ListMovements {
  constructor(private readonly repository: MovementRepository) {}

  execute(scopedUppIds: string[]): Promise<Movement[]> {
    return this.repository.list(scopedUppIds);
  }
}

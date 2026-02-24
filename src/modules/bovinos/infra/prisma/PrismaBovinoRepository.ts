import type { Bovino } from "../../domain/entities/Bovino";
import type { BovinoRepository } from "../../domain/repositories/BovinoRepository";

export class PrismaBovinoRepository implements BovinoRepository {
  list(): Bovino[] {
    throw new Error("PrismaBovinoRepository.list is not implemented in this phase.");
  }
}

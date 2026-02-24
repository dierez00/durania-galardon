import type { Bovino } from "../../domain/entities/Bovino";
import type { BovinoRepository } from "../../domain/repositories/BovinoRepository";
import { bovinos } from "./bovinos.mock";

export class MockBovinoRepository implements BovinoRepository {
  constructor(private readonly items: Bovino[] = bovinos) {}

  list(): Bovino[] {
    return [...this.items];
  }
}

export const mockBovinoRepository = new MockBovinoRepository();

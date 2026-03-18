import type { Bovino } from "../../domain/entities/Bovino";
import type { BovinoExport } from "../../domain/entities/BovinoExport";
import type { BovinoFieldTest } from "../../domain/entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "../../domain/entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "../../domain/entities/BovinoVaccination";
import type { BovinoRepository } from "../../domain/repositories/BovinoRepository";
import { bovinos } from "./bovinos.mock";

export class MockBovinoRepository implements BovinoRepository {
  constructor(private readonly items: Bovino[] = bovinos) {}

  list(): Promise<Bovino[]> {
    return Promise.resolve([...this.items]);
  }

  getById(id: string): Promise<Bovino | null> {
    const found = this.items.find(b => b.id === id) || null;
    return Promise.resolve(found);
  }

  listFieldTests(_animalId: string): Promise<BovinoFieldTest[]> {
    return Promise.resolve([]);
  }

  listIncidents(_animalId: string): Promise<BovinoSanitaryIncident[]> {
    return Promise.resolve([]);
  }

  listVaccinations(_animalId: string): Promise<BovinoVaccination[]> {
    return Promise.resolve([]);
  }

  listExports(_animalId: string): Promise<BovinoExport[]> {
    return Promise.resolve([]);
  }

  listOffspring(_animalId: string): Promise<Bovino[]> {
    return Promise.resolve([]);
  }
}

export const mockBovinoRepository = new MockBovinoRepository();

import type { Bovino } from "../../domain/entities/Bovino";
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

  listFieldTests(animalId: string): Promise<any[]> {
    return Promise.resolve([]);
  }

  listIncidents(animalId: string): Promise<any[]> {
    return Promise.resolve([]);
  }

  listVaccinations(animalId: string): Promise<any[]> {
    return Promise.resolve([]);
  }

  listExports(animalId: string): Promise<any[]> {
    return Promise.resolve([]);
  }

  listOffspring(animalId: string): Promise<Bovino[]> {
    return Promise.resolve([]);
  }
}

export const mockBovinoRepository = new MockBovinoRepository();

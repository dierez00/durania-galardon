import type { Bovino } from "../../domain/entities/Bovino";
import type { BovinoRepository } from "../../domain/repositories/BovinoRepository";

export class PrismaBovinoRepository implements BovinoRepository {
  list(): Promise<Bovino[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.list is not implemented in this phase."));
  }

  getById(id: string): Promise<Bovino | null> {
    return Promise.reject(new Error("PrismaBovinoRepository.getById is not implemented in this phase."));
  }

  listFieldTests(animalId: string): Promise<any[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listFieldTests is not implemented in this phase."));
  }

  listIncidents(animalId: string): Promise<any[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listIncidents is not implemented in this phase."));
  }

  listVaccinations(animalId: string): Promise<any[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listVaccinations is not implemented in this phase."));
  }

  listExports(animalId: string): Promise<any[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listExports is not implemented in this phase."));
  }

  listOffspring(animalId: string): Promise<Bovino[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listOffspring is not implemented in this phase."));
  }
}

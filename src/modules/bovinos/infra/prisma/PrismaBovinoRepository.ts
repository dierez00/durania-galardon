import type { Bovino } from "../../domain/entities/Bovino";
import type { BovinoExport } from "../../domain/entities/BovinoExport";
import type { BovinoFieldTest } from "../../domain/entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "../../domain/entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "../../domain/entities/BovinoVaccination";
import type { BovinoRepository } from "../../domain/repositories/BovinoRepository";

export class PrismaBovinoRepository implements BovinoRepository {
  list(): Promise<Bovino[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.list is not implemented in this phase."));
  }

  getById(_id: string): Promise<Bovino | null> {
    return Promise.reject(new Error("PrismaBovinoRepository.getById is not implemented in this phase."));
  }

  listFieldTests(_animalId: string): Promise<BovinoFieldTest[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listFieldTests is not implemented in this phase."));
  }

  listIncidents(_animalId: string): Promise<BovinoSanitaryIncident[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listIncidents is not implemented in this phase."));
  }

  listVaccinations(_animalId: string): Promise<BovinoVaccination[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listVaccinations is not implemented in this phase."));
  }

  listExports(_animalId: string): Promise<BovinoExport[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listExports is not implemented in this phase."));
  }

  listOffspring(_animalId: string): Promise<Bovino[]> {
    return Promise.reject(new Error("PrismaBovinoRepository.listOffspring is not implemented in this phase."));
  }
}

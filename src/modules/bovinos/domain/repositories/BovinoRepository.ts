import type { Bovino } from "../entities/Bovino";
import type { BovinoFieldTest } from "../entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "../entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "../entities/BovinoVaccination";
import type { BovinoExport } from "../entities/BovinoExport";

export interface BovinoRepository {
  list(): Promise<Bovino[]>;
  getById(id: string): Promise<Bovino | null>;
  listFieldTests(animalId: string): Promise<BovinoFieldTest[]>;
  listIncidents(animalId: string): Promise<BovinoSanitaryIncident[]>;
  listVaccinations(animalId: string): Promise<BovinoVaccination[]>;
  listExports(animalId: string): Promise<BovinoExport[]>;
  listOffspring(animalId: string): Promise<Bovino[]>;
}

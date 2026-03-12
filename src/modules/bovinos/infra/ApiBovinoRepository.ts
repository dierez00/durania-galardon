import type { Bovino } from "../domain/entities/Bovino";
import type { BovinoFieldTest } from "../domain/entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "../domain/entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "../domain/entities/BovinoVaccination";
import type { BovinoExport } from "../domain/entities/BovinoExport";
import type { BovinoRepository } from "../domain/repositories/BovinoRepository";
import {
  apiFetchBovinos,
  apiFetchBovinoById,
  apiFetchFieldTests,
  apiFetchIncidents,
  apiFetchVaccinations,
  apiFetchExports,
  apiFetchOffspring,
} from "./api/bovinosApi";
import {
  toDomainBovino,
  type BovinoApiRecord,
} from "./mappers/bovino.mapper";
import {
  toDomainFieldTest,
  type FieldTestApiRecord,
} from "./mappers/fieldTest.mapper";

export class ApiBovinoRepository implements BovinoRepository {
  async list(): Promise<Bovino[]> {
    const records = await apiFetchBovinos();
    return (records as BovinoApiRecord[]).map(toDomainBovino);
  }

  async getById(id: string): Promise<Bovino | null> {
    const record = await apiFetchBovinoById(id);
    if (!record) return null;
    return toDomainBovino(record as BovinoApiRecord);
  }

  async listFieldTests(animalId: string): Promise<BovinoFieldTest[]> {
    const records = await apiFetchFieldTests(animalId);
    return (records as FieldTestApiRecord[]).map(toDomainFieldTest);
  }

  async listIncidents(animalId: string): Promise<BovinoSanitaryIncident[]> {
    const records = await apiFetchIncidents(animalId);
    return records as BovinoSanitaryIncident[];
  }

  async listVaccinations(animalId: string): Promise<BovinoVaccination[]> {
    const records = await apiFetchVaccinations(animalId);
    return records as BovinoVaccination[];
  }

  async listExports(animalId: string): Promise<BovinoExport[]> {
    const records = await apiFetchExports(animalId);
    return records as BovinoExport[];
  }

  async listOffspring(animalId: string): Promise<Bovino[]> {
    const records = await apiFetchOffspring(animalId);
    return (records as BovinoApiRecord[]).map(toDomainBovino);
  }
}

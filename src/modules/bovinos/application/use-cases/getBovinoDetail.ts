import type { Bovino } from "../../domain/entities/Bovino";
import type { BovinoRepository } from "../../domain/repositories/BovinoRepository";
import type { BovinoFieldTest } from "../../domain/entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "../../domain/entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "../../domain/entities/BovinoVaccination";
import type { BovinoExport } from "../../domain/entities/BovinoExport";

export interface BovinoDetailResult {
  bovino: Bovino;
  fieldTests: BovinoFieldTest[];
  incidents: BovinoSanitaryIncident[];
  vaccinations: BovinoVaccination[];
  exports: BovinoExport[];
  offspring: Bovino[];
}

export class GetBovinoDetail {
  constructor(private readonly repository: BovinoRepository) {}

  async execute(id: string): Promise<BovinoDetailResult | null> {
    const bovino = await this.repository.getById(id);
    if (!bovino) return null;

    const [fieldTests, incidents, vaccinations, exports_, offspring] =
      await Promise.all([
        this.repository.listFieldTests(id),
        this.repository.listIncidents(id),
        this.repository.listVaccinations(id),
        this.repository.listExports(id),
        this.repository.listOffspring(id),
      ]);

    return {
      bovino,
      fieldTests,
      incidents,
      vaccinations,
      exports: exports_,
      offspring,
    };
  }
}

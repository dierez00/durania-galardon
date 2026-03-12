import type { Bovino, BovinosFiltersState } from "../../domain/entities/Bovino";
import type { BovinoRepository } from "../../domain/repositories/BovinoRepository";
import { filterBovinos } from "../../domain/services/filterBovinos";

export class ListBovinos {
  constructor(private readonly repository: BovinoRepository) {}

  async execute(filters?: Partial<BovinosFiltersState>): Promise<Bovino[]> {
    const bovinos = await this.repository.list();
    if (!filters) return bovinos;
    const full: BovinosFiltersState = {
      search: filters.search ?? "",
      sexo: filters.sexo ?? "",
      sanitario: filters.sanitario ?? "",
      exportable: filters.exportable ?? "",
      fechaDesde: filters.fechaDesde ?? "",
      fechaHasta: filters.fechaHasta ?? "",
    };
    return filterBovinos(bovinos, full);
  }
}

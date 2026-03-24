import type { Exportacion } from "../entities/ExportacionesEntity";

export interface ExportacionesRepository {
  list(): Exportacion[];
}


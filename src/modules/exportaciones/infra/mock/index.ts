import type { Exportacion } from "../../domain/entities/ExportacionesEntity";
import type { ExportacionesRepository } from "../../domain/repositories/exportacionesRepository";
import { exportacionesMock } from "./exportaciones.mock";

export class MockExportacionesRepository implements ExportacionesRepository {
  constructor(private readonly items: Exportacion[] = exportacionesMock) {}

  list(): Exportacion[] {
    return [...this.items];
  }
}

export const mockExportacionesRepository = new MockExportacionesRepository();
export { exportacionesMock } from "./exportaciones.mock";


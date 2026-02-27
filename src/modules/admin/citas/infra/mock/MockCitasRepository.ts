import type { CitasRepository } from "../../domain/repositories/citasRepository";
import type { Cita } from "../../domain/entities/CitaEntity";
import { citasMock } from "./citas.mock";

export class MockCitasRepository implements CitasRepository {
  list(): Cita[] {
    return citasMock;
  }
}

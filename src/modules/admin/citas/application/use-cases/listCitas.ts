import type { Cita } from "../../domain/entities/CitaEntity";
import type { CitasRepository } from "../../domain/repositories/citasRepository";

export function listCitas(repository: CitasRepository): Cita[] {
  return repository.list();
}

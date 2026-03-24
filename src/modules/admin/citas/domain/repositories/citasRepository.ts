import type { Cita } from "../entities/CitaEntity";

export interface CitasRepository {
  list(): Cita[];
}

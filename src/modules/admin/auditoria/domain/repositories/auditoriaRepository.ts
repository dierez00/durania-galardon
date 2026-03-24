import type { AuditoriaLog } from "../entities/AuditoriaLogEntity";

export interface AuditoriaRepository {
  list(): AuditoriaLog[];
}

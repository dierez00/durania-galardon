import type { AuditoriaLog } from "../../domain/entities/AuditoriaLogEntity";
import type { AuditoriaRepository } from "../../domain/repositories/auditoriaRepository";

export function listAuditoriaLogs(repository: AuditoriaRepository): AuditoriaLog[] {
  return repository.list();
}

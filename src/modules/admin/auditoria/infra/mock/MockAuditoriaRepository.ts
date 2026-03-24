import type { AuditoriaRepository } from "../../domain/repositories/auditoriaRepository";
import type { AuditoriaLog } from "../../domain/entities/AuditoriaLogEntity";
import { auditoriaLogsMock } from "./auditoria.mock";

export class MockAuditoriaRepository implements AuditoriaRepository {
  list(): AuditoriaLog[] {
    return auditoriaLogsMock;
  }
}

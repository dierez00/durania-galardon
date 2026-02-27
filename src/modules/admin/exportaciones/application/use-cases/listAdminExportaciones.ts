import type { AdminExportacion } from "../../domain/entities/AdminExportacionEntity";
import type { AdminExportacionesRepository } from "../../domain/repositories/adminExportacionesRepository";

export function listAdminExportaciones(repository: AdminExportacionesRepository): AdminExportacion[] {
  return repository.list();
}

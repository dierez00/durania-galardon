import type { AdminExportacionesRepository } from "../../domain/repositories/adminExportacionesRepository";
import type { AdminExportacion } from "../../domain/entities/AdminExportacionEntity";
import { adminExportacionesMock } from "./adminExportaciones.mock";

export class MockAdminExportacionesRepository implements AdminExportacionesRepository {
  list(): AdminExportacion[] {
    return adminExportacionesMock;
  }
}

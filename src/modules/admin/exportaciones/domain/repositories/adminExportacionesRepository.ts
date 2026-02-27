import type { AdminExportacion } from "../entities/AdminExportacionEntity";

export interface AdminExportacionesRepository {
  list(): AdminExportacion[];
}

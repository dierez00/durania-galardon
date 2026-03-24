import type {
  AdminExportacion,
  AdminExportacionesSortDir,
  AdminExportacionesSortField,
} from "../entities/AdminExportacionEntity";

export interface ListAdminExportacionesParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: AdminExportacionesSortField;
  sortDir?: AdminExportacionesSortDir;
}

export interface ListAdminExportacionesResult {
  exportaciones: AdminExportacion[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminExportacionesRepository {
  list(params: ListAdminExportacionesParams): Promise<ListAdminExportacionesResult>;
}

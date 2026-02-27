import type {
  AdminProductor,
  AdminProductoresSortField,
  AdminProductoresSortDir,
} from "../entities/AdminProductorEntity";

// ─── Input / Output del puerto ─────────────────────────────────────────────────

/** Parámetros de consulta para listar productores — pertenecen a domain, no a infra */
export interface ListAdminProductoresParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: AdminProductoresSortField;
  sortDir?: AdminProductoresSortDir;
}

export interface ListAdminProductoresResult {
  producers: AdminProductor[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Input de creación definido en domain para que el puerto no importe nada de application.
 * Tiene la misma forma que CreateAdminProductorDTO.
 */
export interface AdminProductorCreateInput {
  email: string;
  password: string;
  fullName: string;
  curp?: string;
}

// ─── Puerto (contrato hexagonal) ───────────────────────────────────────────────

export interface AdminProductoresRepository {
  list(params: ListAdminProductoresParams): Promise<ListAdminProductoresResult>;
  create(input: AdminProductorCreateInput): Promise<AdminProductor>;
}

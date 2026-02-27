import type {
  AdminProductor,
  AdminProductoresSortDir,
  AdminProductoresSortField,
} from "../entities/AdminProductorEntity";

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

export interface AdminProductorCreateInput {
  email: string;
  password: string;
  fullName: string;
  curp?: string;
}

export interface AdminProductorBatchRowInput {
  email: string;
  fullName: string;
  curp?: string;
}

export interface AdminProductorBatchCreateInput {
  rows: AdminProductorBatchRowInput[];
  options: {
    atomic: true;
  };
}

export interface AdminBatchCreateSuccessItem {
  rowIndex: number;
  entityId: string;
  tenantId: string;
  email: string;
  temporaryPassword: string;
}

export interface AdminProductorBatchCreateResult {
  created: AdminBatchCreateSuccessItem[];
  count: number;
}

export interface AdminProductoresRepository {
  list(params: ListAdminProductoresParams): Promise<ListAdminProductoresResult>;
  create(input: AdminProductorCreateInput): Promise<AdminProductor>;
  createBatch(input: AdminProductorBatchCreateInput): Promise<AdminProductorBatchCreateResult>;
}

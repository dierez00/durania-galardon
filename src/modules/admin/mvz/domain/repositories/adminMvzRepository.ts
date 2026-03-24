import type {
  AdminMvz,
  AdminMvzSortDir,
  AdminMvzSortField,
} from "../entities/AdminMvzEntity";

export type AdminMvzRoleKey = "mvz_government" | "mvz_internal";

export interface ListAdminMvzParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: AdminMvzSortField;
  sortDir?: AdminMvzSortDir;
}

export interface ListAdminMvzResult {
  mvzProfiles: AdminMvz[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminMvzBatchRowInput {
  email: string;
  fullName: string;
  licenseNumber: string;
}

export interface AdminMvzBatchCreateInput {
  rows: AdminMvzBatchRowInput[];
  options: {
    atomic: true;
    roleKey: AdminMvzRoleKey;
  };
}

export interface AdminMvzBatchCreateSuccessItem {
  rowIndex: number;
  entityId: string;
  tenantId: string;
  email: string;
  invitationSent: boolean;
}

export interface AdminMvzBatchCreateResult {
  created: AdminMvzBatchCreateSuccessItem[];
  count: number;
}

export interface AdminMvzRepository {
  list(params: ListAdminMvzParams): Promise<ListAdminMvzResult>;
  createBatch(input: AdminMvzBatchCreateInput): Promise<AdminMvzBatchCreateResult>;
}

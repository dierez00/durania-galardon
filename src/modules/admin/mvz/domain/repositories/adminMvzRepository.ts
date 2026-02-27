import type { AdminMvz } from "../entities/AdminMvzEntity";

export type AdminMvzRoleKey = "mvz_government" | "mvz_internal";

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
  temporaryPassword: string;
}

export interface AdminMvzBatchCreateResult {
  created: AdminMvzBatchCreateSuccessItem[];
  count: number;
}

export interface AdminMvzRepository {
  list(): Promise<AdminMvz[]>;
  createBatch(input: AdminMvzBatchCreateInput): Promise<AdminMvzBatchCreateResult>;
}

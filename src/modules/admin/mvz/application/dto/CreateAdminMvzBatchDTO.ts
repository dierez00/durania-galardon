import type { AdminMvzRoleKey } from "../../domain/repositories/adminMvzRepository";

export interface CreateAdminMvzBatchRowDTO {
  email: string;
  fullName: string;
  licenseNumber: string;
}

export interface CreateAdminMvzBatchDTO {
  rows: CreateAdminMvzBatchRowDTO[];
  options: {
    atomic: true;
    roleKey: AdminMvzRoleKey;
  };
}

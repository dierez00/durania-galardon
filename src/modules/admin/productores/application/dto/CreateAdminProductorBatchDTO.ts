export interface CreateAdminProductorBatchRowDTO {
  email: string;
  fullName: string;
  curp?: string;
}

export interface CreateAdminProductorBatchDTO {
  rows: CreateAdminProductorBatchRowDTO[];
  options: {
    atomic: true;
  };
}

export interface BatchCreateSuccessItemDTO {
  rowIndex: number;
  entityId: string;
  tenantId: string;
  email: string;
  temporaryPassword: string;
}

export interface BatchCreateSuccessDTO {
  created: BatchCreateSuccessItemDTO[];
  count: number;
}

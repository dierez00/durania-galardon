import type { AdminExportacionStatus } from "../../domain/entities/AdminExportacionEntity";

export interface UpdateAdminExportacionStatusDTO {
  status: AdminExportacionStatus;
  blockedReason?: string;
  complianceRule60?: boolean;
  tbBrValidated?: boolean;
  blueTagAssigned?: boolean;
}

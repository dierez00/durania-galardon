import type { AdminExportacionMetrics, AdminExportacionStatus } from "./AdminExportacionEntity";

export interface AdminExportacionDetallada {
  id: string;
  producerId: string | null;
  uppId: string | null;
  producerName: string | null;
  uppName: string | null;
  uppCode: string | null;
  status: AdminExportacionStatus;
  complianceRule60: boolean | null;
  tbBrValidated: boolean | null;
  blueTagAssigned: boolean | null;
  monthlyBucket: string | null;
  metricsJson: AdminExportacionMetrics | null;
  blockedReason: string | null;
  validatedByMvzUserId: string | null;
  approvedByAdminUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
  totalAnimals: number;
}

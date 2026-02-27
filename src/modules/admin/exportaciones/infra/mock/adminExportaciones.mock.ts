import type { AdminExportacion } from "@/modules/admin/exportaciones/domain/entities/AdminExportacionEntity";

export const adminExportacionesMock: AdminExportacion[] = [
  {
    id: "exp-1",
    upp_id: "upp-001",
    status: "pending_review",
    compliance_60_rule: true,
    tb_br_validated: true,
    blue_tag_assigned: false,
    blocked_reason: null,
    created_at: "2025-12-01T00:00:00Z",
  },
  {
    id: "exp-2",
    upp_id: "upp-003",
    status: "final_approved",
    compliance_60_rule: true,
    tb_br_validated: true,
    blue_tag_assigned: true,
    blocked_reason: null,
    created_at: "2025-11-15T00:00:00Z",
  },
  {
    id: "exp-3",
    upp_id: "upp-007",
    status: "blocked",
    compliance_60_rule: false,
    tb_br_validated: false,
    blue_tag_assigned: false,
    blocked_reason: "No cumple regla 60",
    created_at: "2025-10-20T00:00:00Z",
  },
];

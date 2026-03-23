import type { Movement } from "../../domain/entities/Movement";

export interface MovementRow {
  id: string;
  tenant_id: string;
  producer_id: string | null;
  upp_id: string | null;
  requested_by_user_id: string | null;
  status: Movement["status"];
  qr_code: string | null;
  route_note: string | null;
  incidence_note: string | null;
  movement_date: string | null;
  created_at: string;
  updated_at: string;
}

export function toDomainMovement(row: MovementRow): Movement {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    producerId: row.producer_id,
    uppId: row.upp_id,
    requestedByUserId: row.requested_by_user_id,
    status: row.status,
    qrCode: row.qr_code,
    routeNote: row.route_note,
    incidenceNote: row.incidence_note,
    movementDate: row.movement_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

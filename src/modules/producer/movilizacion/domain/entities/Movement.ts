export const MOVEMENT_STATUS = ["requested", "approved", "rejected", "cancelled"] as const;

export type MovementStatus = (typeof MOVEMENT_STATUS)[number];

export interface Movement {
  id: string;
  tenantId: string;
  producerId: string | null;
  uppId: string | null;
  requestedByUserId: string | null;
  status: MovementStatus;
  qrCode: string | null;
  routeNote: string | null;
  incidenceNote: string | null;
  movementDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReemoMovementRequest {
  uppId: string;
  movementDate?: string;
  routeNote?: string;
  destinationText?: string;
  validUntil?: string;
  authorizedTags: string[];
}

export interface ConfirmMovementArrivalRequest {
  movementId: string;
  destinationType: "internal" | "external";
  destinationUppId?: string;
  receivedTags: string[];
  incidenceNote?: string;
}

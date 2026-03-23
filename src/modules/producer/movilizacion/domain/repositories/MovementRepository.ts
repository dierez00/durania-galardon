import type { ConfirmMovementArrivalRequest, Movement, ReemoMovementRequest } from "../entities/Movement";
import type { AnimalSnapshot, FieldTestSnapshot } from "../entities/SanitaryValidation";

export interface CreateMovementParams {
  tenantId: string;
  producerId: string;
  requestedByUserId: string;
  request: ReemoMovementRequest;
  qrCode: string;
}

export interface ConfirmMovementParams {
  tenantId: string;
  request: ConfirmMovementArrivalRequest;
  incidenceNote: string | null;
}

export interface MovementRepository {
  list(scopedUppIds: string[]): Promise<Movement[]>;
  getById(id: string): Promise<Movement | null>;
  getAnimalsByTags(tenantId: string, uppId: string, tags: string[]): Promise<AnimalSnapshot[]>;
  getLatestFieldTestsByAnimal(tenantId: string, animalIds: string[]): Promise<FieldTestSnapshot[]>;
  hasActiveQuarantine(uppId: string): Promise<boolean>;
  create(params: CreateMovementParams): Promise<Movement>;
  confirmArrival(params: ConfirmMovementParams): Promise<void>;
}

export interface SignedReemoPayload {
  tenantId: string;
  uppId: string;
  destinationText: string;
  validUntil: string;
  authorizedTags: string[];
  issuedAt: string;
}

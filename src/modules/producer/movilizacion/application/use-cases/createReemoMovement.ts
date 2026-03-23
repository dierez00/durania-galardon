import type { Movement, ReemoMovementRequest } from "../../domain/entities/Movement";
import type { MovementRepository } from "../../domain/repositories/MovementRepository";
import type { SanitaryValidationResult } from "../../domain/entities/SanitaryValidation";
import { evaluateSanitaryValidation } from "../../domain/services/sanitaryValidation";
import { signReemoPayload } from "../../domain/services/reemoQrSigner";

export interface CreateReemoMovementResult {
  movement: Movement;
  sanitaryValidation: SanitaryValidationResult;
}

export class CreateReemoMovement {
  constructor(private readonly repository: MovementRepository) {}

  async execute(params: {
    tenantId: string;
    producerId: string;
    requestedByUserId: string;
    request: ReemoMovementRequest;
  }): Promise<CreateReemoMovementResult> {
    const normalizedTags = params.request.authorizedTags
      .map((tag) => tag.trim())
      .filter((tag, index, self) => tag.length > 0 && self.indexOf(tag) === index);

    if (normalizedTags.length === 0) {
      throw new Error("Debe enviar al menos un arete autorizado.");
    }

    const animals = await this.repository.getAnimalsByTags(params.tenantId, params.request.uppId, normalizedTags);
    if (animals.length !== normalizedTags.length) {
      throw new Error("Uno o más aretes no pertenecen a la UPP seleccionada.");
    }

    const animalIds = animals.map((animal) => animal.id);
    const [tests, hasActiveQuarantine] = await Promise.all([
      this.repository.getLatestFieldTestsByAnimal(params.tenantId, animalIds),
      this.repository.hasActiveQuarantine(params.request.uppId),
    ]);

    const sanitaryValidation = evaluateSanitaryValidation({
      animals,
      tests,
      hasActiveQuarantine,
      todayIsoDate: new Date().toISOString().slice(0, 10),
    });

    if (!sanitaryValidation.passed) {
      throw new Error(
        `La solicitud no cumple validación sanitaria: ${sanitaryValidation.animals
          .filter((animal) => !animal.passed)
          .map((animal) => `${animal.siniigaTag} (${animal.reasons.join(", ")})`)
          .join("; ")}`
      );
    }

    const movementDate = params.request.movementDate ?? new Date().toISOString().slice(0, 10);
    const validUntil = params.request.validUntil ?? movementDate;
    const destinationText = params.request.destinationText?.trim() || "Destino no especificado";

    const qrCode = signReemoPayload({
      tenantId: params.tenantId,
      uppId: params.request.uppId,
      destinationText,
      validUntil,
      authorizedTags: normalizedTags,
      issuedAt: new Date().toISOString(),
    });

    const movement = await this.repository.create({
      tenantId: params.tenantId,
      producerId: params.producerId,
      requestedByUserId: params.requestedByUserId,
      request: {
        ...params.request,
        movementDate,
        routeNote: params.request.routeNote?.trim() || undefined,
        destinationText,
        validUntil,
        authorizedTags: normalizedTags,
      },
      qrCode,
    });

    return {
      movement,
      sanitaryValidation,
    };
  }
}

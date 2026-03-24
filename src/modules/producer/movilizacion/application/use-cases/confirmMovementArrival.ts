import type { ConfirmMovementArrivalRequest } from "../../domain/entities/Movement";
import type { MovementRepository } from "../../domain/repositories/MovementRepository";
import { verifyReemoPayload } from "../../domain/services/reemoQrSigner";

export class ConfirmMovementArrival {
  constructor(private readonly repository: MovementRepository) {}

  async execute(params: { tenantId: string; request: ConfirmMovementArrivalRequest }): Promise<void> {
    const movement = await this.repository.getById(params.request.movementId);
    if (!movement) {
      throw new Error("Solicitud de movilización no encontrada.");
    }
    if (!movement.qrCode) {
      throw new Error("La solicitud no contiene QR emitido.");
    }

    const payload = verifyReemoPayload(movement.qrCode);
    if (!payload) {
      throw new Error("El QR no es válido o fue alterado.");
    }

    const normalizedReceivedTags = params.request.receivedTags
      .map((tag) => tag.trim())
      .filter((tag, index, self) => tag.length > 0 && self.indexOf(tag) === index);

    if (normalizedReceivedTags.length === 0) {
      throw new Error("Debe enviar aretes recibidos para confirmar la llegada.");
    }

    const missingAuthorized = payload.authorizedTags.filter((tag) => !normalizedReceivedTags.includes(tag));
    const unexpectedReceived = normalizedReceivedTags.filter((tag) => !payload.authorizedTags.includes(tag));

    const incidenceParts: string[] = [];
    if (missingAuthorized.length > 0) {
      incidenceParts.push(`Faltantes: ${missingAuthorized.join(", ")}`);
    }
    if (unexpectedReceived.length > 0) {
      incidenceParts.push(`No autorizados: ${unexpectedReceived.join(", ")}`);
    }
    if (params.request.incidenceNote?.trim()) {
      incidenceParts.push(params.request.incidenceNote.trim());
    }

    await this.repository.confirmArrival({
      tenantId: params.tenantId,
      request: {
        ...params.request,
        receivedTags: normalizedReceivedTags,
      },
      incidenceNote: incidenceParts.length > 0 ? incidenceParts.join(" | ") : null,
    });
  }
}

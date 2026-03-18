import type { IProducerDocumentsRepository } from "../../domain/repositories/producerDocumentsRepository";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import { documentDeletionPolicy } from "../../domain/services/documentDeletionPolicy";

/**
 * Caso de uso: Eliminar documento personal del productor
 *
 * Valida las reglas de negocio antes de eliminar el documento.
 * Regla:
 * - Nunca eliminar documentos validados.
 * - No eliminar la unica version disponible.
 */
export class DeleteProducerDocumentUseCase {
  constructor(private repository: IProducerDocumentsRepository) {}

  async execute(document: ProducerDocument, hasOtherVersion: boolean): Promise<void> {
    // Validar reglas de negocio
    const policyInput = {
      isCurrent: document.isCurrent,
      status: document.status,
      hasOtherVersion,
    };
    if (!documentDeletionPolicy.canDelete(policyInput)) {
      const reason = documentDeletionPolicy.getDeletionBlockedReason(policyInput);
      throw new Error(reason);
    }

    // Delegar eliminación al repositorio
    await this.repository.delete(document.id);
  }
}

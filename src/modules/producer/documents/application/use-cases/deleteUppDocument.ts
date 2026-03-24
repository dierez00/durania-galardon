import type { IUppDocumentsRepository } from "../../domain/repositories/uppDocumentsRepository";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";
import { documentDeletionPolicy } from "../../domain/services/documentDeletionPolicy";

/**
 * Caso de uso: Eliminar documento UPP
 *
 * Valida las reglas de negocio antes de eliminar el documento.
 * Regla:
 * - Nunca eliminar documentos validados.
 * - No eliminar la unica version disponible.
 */
export class DeleteUppDocumentUseCase {
  constructor(private repository: IUppDocumentsRepository) {}

  async execute(document: UppDocument, hasOtherVersion: boolean): Promise<void> {
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

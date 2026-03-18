import type { DocumentStatus } from "../entities/ProducerDocumentEntity";

export interface DeletableDocument {
  isCurrent: boolean;
  status: DocumentStatus;
  hasOtherVersion: boolean;
}

/**
 * Regla de borrado:
 * - Un documento validado nunca se puede eliminar.
 * - Si no existe otra version de la misma categoria, no se puede eliminar.
 * - Un documento vencido sin otra version tampoco se puede eliminar.
 */
export class DocumentDeletionPolicy {
  canDelete(doc: DeletableDocument): boolean {
    if (doc.status === "validated") return false;
    if (!doc.hasOtherVersion) return false;
    return true;
  }

  getDeletionBlockedReason(doc: DeletableDocument): string {
    if (doc.status === "validated") {
      return "No se puede eliminar un documento validado.";
    }
    if (doc.status === "expired" && !doc.hasOtherVersion) {
      return "No se puede eliminar un documento vencido sin otra version del mismo tipo.";
    }
    if (!doc.hasOtherVersion) {
      return "No se puede eliminar si solo existe una version del documento.";
    }
    return "";
  }
}

export const documentDeletionPolicy = new DocumentDeletionPolicy();

import type { DocumentStatus } from "../entities/ProducerDocumentEntity";

export interface DeletableDocument {
  isCurrent: boolean;
  status: DocumentStatus;
  hasOtherVersion: boolean;
}

/**
 * Regla de borrado:
 * - Un documento PENDING siempre se puede eliminar.
 * - Un documento VALIDATED nunca se puede eliminar.
 * - Un documento EXPIRED solo se puede eliminar si existe otra versión.
 * - Un documento REJECTED solo se puede eliminar si existe otra versión.
 */
export class DocumentDeletionPolicy {
  canDelete(doc: DeletableDocument): boolean {
    // Los documentos pendientes SIEMPRE se pueden eliminar
    if (doc.status === "pending") return true;
    
    // Los documentos validados NUNCA se pueden eliminar
    if (doc.status === "validated") return false;
    
    // Para expired y rejected, se pueden eliminar solo si hay otra versión
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
    if (doc.status === "rejected" && !doc.hasOtherVersion) {
      return "No se puede eliminar un documento rechazado sin otra version del mismo tipo.";
    }
    if (!doc.hasOtherVersion) {
      return "No se puede eliminar si solo existe una version del documento.";
    }
    return "";
  }
}

export const documentDeletionPolicy = new DocumentDeletionPolicy();

import { ProducerDocument, DocumentStatus } from "@/modules/producer/documents/domain/entities/ProducerDocumentEntity";
import { UppDocument } from "@/modules/producer/documents/domain/entities/UppDocumentEntity";
import { DocumentChangeEvent } from "@/modules/producer/documents/domain/types/DocumentEvents";

export class DocumentChangeDetector {
  private readonly EXPIRY_WARNING_DAYS = 30;
  // IDs que ya recibieron alerta de vencimiento en esta sesión (evita repetición cada poll)
  private readonly alertedExpiryIds = new Set<string>();

  private getDocumentType(doc: ProducerDocument | UppDocument): string {
    return 'documentType' in doc ? doc.documentType : doc.documentTypeName;
  }

  private calculateDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  detectChanges(
    previousDocs: (ProducerDocument | UppDocument)[] = [],
    currentDocs: (ProducerDocument | UppDocument)[],
    level: 'personal' | 'upp'
  ): DocumentChangeEvent[] {
    const events: DocumentChangeEvent[] = [];

    // Crear mapas para búsqueda O(1)
    const prevMap = new Map(previousDocs.map(d => [d.id, d]));
    const currMap = new Map(currentDocs.map(d => [d.id, d]));

    // Detectar cambios de status y vencimientos
    for (const [docId, currDoc] of currMap) {
      const prevDoc = prevMap.get(docId);
      // Calcular documentType UNA SOLA VEZ al inicio del loop
      const documentType = this.getDocumentType(currDoc);

      // 1. Status cambió
      if (prevDoc && prevDoc.status !== currDoc.status) {
        events.push({
          type: 'status-changed',
          data: {
            documentId: docId,
            documentType,
            documentLevel: level,
            previousStatus: prevDoc.status as DocumentStatus,
            newStatus: currDoc.status as DocumentStatus,
          }
        });
      }

      // 2. Documento nuevo (no existía antes)
      if (!prevDoc) {
        events.push({
          type: 'newly-uploaded',
          data: {
            documentId: docId,
            documentType,
            documentLevel: level,
            uploadedAt: currDoc.uploadedAt,
          }
        });
      }

      // 3. Vencimiento próximo (< 30 días) — solo alertar una vez por documento por sesión
      if (currDoc.expiryDate && !this.alertedExpiryIds.has(docId)) {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(currDoc.expiryDate);

        if (daysUntilExpiry > 0 && daysUntilExpiry <= this.EXPIRY_WARNING_DAYS) {
          events.push({
            type: 'expiring-soon',
            data: {
              documentId: docId,
              documentType,
              documentLevel: level,
              daysUntilExpiry,
              expiryDate: currDoc.expiryDate,
            }
          });
          this.alertedExpiryIds.add(docId);
        } else if (daysUntilExpiry <= 0) {
          // Documento vencido
          events.push({
            type: 'expired',
            data: {
              documentId: docId,
              documentType,
              documentLevel: level,
              daysUntilExpiry,
              expiryDate: currDoc.expiryDate,
            }
          });
          this.alertedExpiryIds.add(docId);
        }
      }
    }

    return events;
  }
}

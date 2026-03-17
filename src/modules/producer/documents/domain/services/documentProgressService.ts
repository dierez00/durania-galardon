import { ProducerDocument, PRODUCER_PERSONAL_DOCUMENT_TYPES } from "../entities/ProducerDocumentEntity";
import { UppDocument, UPP_DOCUMENT_TYPES } from "../entities/UppDocumentEntity";
import { DocumentProgress, DocumentProgressItem } from "../entities/DocumentProgressEntity";

export function calculateDocumentProgress(
  producerDocs: ProducerDocument[],
  uppDocs: UppDocument[],
  upps: Array<{ id: string; name: string }>
): DocumentProgress {
  const items: DocumentProgressItem[] = [];

  // Personal documents (3)
  PRODUCER_PERSONAL_DOCUMENT_TYPES.forEach((type) => {
    const doc = producerDocs.find(d => d.documentTypeKey === type.key && d.isCurrent);
    items.push({
      documentKey: type.key,
      documentName: type.name,
      level: "personal",
      status: doc ? mapStatus(doc.status) : "pending"
    });
  });

  // UPP documents (2 per UPP)
  upps.forEach((upp) => {
    UPP_DOCUMENT_TYPES.forEach((type) => {
      const doc = uppDocs.find(d => d.uppId === upp.id && d.documentType === type.key && d.isCurrent);
      items.push({
        documentKey: type.key,
        documentName: type.name,
        level: "upp",
        status: doc ? mapStatus(doc.status) : "pending",
        uppId: upp.id,
        uppName: upp.name
      });
    });
  });

  const completed = items.filter(i => i.status === "completed").length;
  const uploaded = items.filter(i => i.status === "uploaded").length;
  const pending = items.filter(i => i.status === "pending").length;
  const rejected = items.filter(i => i.status === "rejected").length;
  const expired = items.filter(i => i.status === "expired").length;
  const totalRequired = items.length;

  return {
    totalRequired,
    completed,
    uploaded,
    pending,
    rejected,
    expired,
    percentComplete: totalRequired > 0 ? Math.round(((completed + uploaded) / totalRequired) * 100) : 0,
    items
  };
}

function mapStatus(status: string): "completed" | "uploaded" | "pending" | "expired" | "rejected" {
  if (status === "validated") return "completed";
  if (status === "pending") return "uploaded"; // subido, en espera de validación
  if (status === "expired") return "expired";
  if (status === "rejected") return "rejected";
  return "pending"; // no subido aún
}
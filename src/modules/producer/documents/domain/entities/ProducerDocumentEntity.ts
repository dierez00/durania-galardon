export interface ProducerDocument {
  id: string;
  tenantId: string;
  producerId: string;
  documentTypeId: string;
  documentTypeName: string;
  documentTypeKey: string;
  fileStorageKey: string;
  fileHash: string;
  status: DocumentStatus;
  comments: string | null;
  isCurrent: boolean;
  expiryDate: string | null;
  uploadedAt: string;
  ocrConfidence: number | null;
  fullText: string | null;
  ocrText: string | null;
  ocrFields: Record<string, unknown> | null;
  ocrMetadata: Record<string, unknown> | null;
}

export type DocumentStatus = "pending" | "validated" | "expired" | "rejected";

export const PRODUCER_PERSONAL_DOCUMENT_TYPES = [
  { key: "ine", name: "INE", requiresExpiry: true, issueDateBased: false },
  { key: "curp", name: "CURP", requiresExpiry: false, issueDateBased: false },
  { key: "comprobante_domicilio", name: "Comprobante de Domicilio", requiresExpiry: true, issueDateBased: true },
] as const;

export type ProducerPersonalDocumentType = typeof PRODUCER_PERSONAL_DOCUMENT_TYPES[number];

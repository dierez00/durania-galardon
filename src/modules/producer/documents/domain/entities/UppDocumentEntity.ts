export interface UppDocument {
  id: string;
  tenantId: string;
  uppId: string;
  documentType: string;
  fileStorageKey: string;
  fileHash: string;
  status: DocumentStatus;
  comments: string | null;
  isCurrent: boolean;
  issuedAt: string | null;
  expiryDate: string | null;
  uploadedAt: string;
}

export type DocumentStatus = "pending" | "validated" | "expired" | "rejected";

export const UPP_DOCUMENT_TYPES = [
  { key: "escritura_rancho", name: "Escritura del Rancho", requiresExpiry: false },
  { key: "constancia_upp", name: "Constancia de la UPP", requiresExpiry: true },
] as const;

export type UppDocumentType = typeof UPP_DOCUMENT_TYPES[number];

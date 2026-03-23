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

export const UPP_MOVILIZACION_BOVINO_DOCUMENT_TYPES = [
  { key: "tb_resultado", name: "Resultado TB vigente", requiresExpiry: true },
  { key: "br_resultado", name: "Resultado BR vigente", requiresExpiry: true },
  { key: "guia_transito", name: "Soporte de movilización", requiresExpiry: false },
  { key: "aretes_siniiga", name: "Aretes SINIIGA", requiresExpiry: false },
  {
    key: "certificado_zoosanitario_movilizacion",
    name: "Certificado Zoosanitario de Movilización (CZM)",
    requiresExpiry: true,
  },
  {
    key: "factura_constancia_facturacion",
    name: "Factura de Compra o Constancia de Facturación",
    requiresExpiry: false,
  },
  { key: "patente_fierro_quemador", name: "Patente de Fierro Quemador", requiresExpiry: false },
] as const;

export type UppDocumentType = typeof UPP_DOCUMENT_TYPES[number];

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
  fullText: string | null;
  ocrText: string | null;
  ocrFields: Record<string, unknown> | null;
  ocrMetadata: Record<string, unknown> | null;
}

export type DocumentStatus = "pending" | "validated" | "expired" | "rejected";

export const UPP_DOCUMENT_TYPES = [
  { key: "escritura_rancho", name: "Escritura del Rancho", requiresExpiry: false },
  { key: "constancia_upp", name: "Constancia de la UPP", requiresExpiry: true },
] as const;

export const UPP_EXPORTACION_DOCUMENT_TYPES = [
  {
    key: "certificado_zoosanitario_exportacion",
    name: "Certificado Zoosanitario de Exportación (CZE)",
    requiresExpiry: true,
  },
  { key: "identificacion_siniiga_arete_azul", name: "Identificación SINIIGA (Arete Azul)", requiresExpiry: false },
  { key: "pruebas_laboratorio_tb_br", name: "Pruebas de laboratorio (TB/BR)", requiresExpiry: true },
  { key: "factura_comercial", name: "Factura comercial", requiresExpiry: false },
  { key: "encargo_conferido", name: "Encargo conferido", requiresExpiry: false },
  { key: "pedimento_exportacion", name: "Pedimento de exportación", requiresExpiry: false },
  { key: "certificado_origen", name: "Certificado de origen", requiresExpiry: true },
  { key: "imagen_fierro_herrar", name: "Imagen del Fierro de Herrar", requiresExpiry: false },
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
export type UppExportacionDocumentType = typeof UPP_EXPORTACION_DOCUMENT_TYPES[number];

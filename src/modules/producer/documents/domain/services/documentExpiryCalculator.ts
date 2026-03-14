import { PRODUCER_PERSONAL_DOCUMENT_TYPES } from "../entities/ProducerDocumentEntity";

/** Meses de validez para documentos basados en fecha de emisión (comprobante de domicilio). */
export const ISSUE_DATE_VALIDITY_MONTHS = 3;

/**
 * Dado un tipo de documento y la fecha capturada por el usuario, devuelve la
 * fecha de vencimiento real que debe guardarse en la base de datos.
 *
 * Para tipos con `issueDateBased: true` (ej. comprobante_domicilio) el usuario
 * captura la fecha de emisión y la vigencia se calcula sumando
 * ISSUE_DATE_VALIDITY_MONTHS meses.
 *
 * Para el resto de tipos la fecha capturada ES la fecha de vigencia.
 *
 * @param documentTypeKey  Clave del tipo de documento (ej. "comprobante_domicilio")
 * @param inputDate        Fecha en formato YYYY-MM-DD ingresada por el usuario
 * @returns                Fecha de vencimiento en formato YYYY-MM-DD
 */
export function resolveExpiryDate(documentTypeKey: string, inputDate: string): string {
  const docType = PRODUCER_PERSONAL_DOCUMENT_TYPES.find((t) => t.key === documentTypeKey);

  if (docType?.issueDateBased) {
    const [year, month, day] = inputDate.split("-").map(Number);
    const expiry = new Date(year, month - 1 + ISSUE_DATE_VALIDITY_MONTHS, day);
    const yy = expiry.getFullYear();
    const mm = String(expiry.getMonth() + 1).padStart(2, "0");
    const dd = String(expiry.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  return inputDate;
}

/**
 * Indica si el tipo de documento usa fecha de emisión como entrada
 * en lugar de fecha de vigencia directa.
 */
export function isIssueDateBased(documentTypeKey: string): boolean {
  return (
    PRODUCER_PERSONAL_DOCUMENT_TYPES.find((t) => t.key === documentTypeKey)?.issueDateBased ??
    false
  );
}

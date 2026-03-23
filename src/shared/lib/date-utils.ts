/**
 * Utilidades para manejo de fechas
 */

/**
 * Formatea una fecha en formato ISO (YYYY-MM-DD) a formato legible
 * @param dateStr Fecha en formato ISO (YYYY-MM-DD)
 * @param locale Locale para el formateo (por defecto: 'es-ES')
 * @returns Fecha formateada (ej: "15 de junio de 2025")
 */
export function formatDate(
  dateStr: string,
  locale: string = "es-ES"
): string {
  try {
    const date = new Date(dateStr + "T00:00:00Z"); // Agregar hora para evitar problemas de zona horaria
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
}

/**
 * Calcula los días restantes hasta una fecha de vencimiento
 * @param expiryDate Fecha de vencimiento en formato ISO (YYYY-MM-DD)
 * @returns Número de días restantes (negativo si ya venció)
 */
export function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00Z");
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determina si una fecha de vencimiento está próxima (dentro de 30 días)
 * @param expiryDate Fecha de vencimiento en formato ISO (YYYY-MM-DD)
 * @param daysThreshold Número de días para considerar como "próximo" (por defecto: 30)
 * @returns true si la fecha está dentro del umbral, false en caso contrario
 */
export function isExpiringsoon(
  expiryDate: string,
  daysThreshold: number = 30
): boolean {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  return daysUntil > 0 && daysUntil <= daysThreshold;
}

/**
 * Determina si una fecha de vencimiento ya pasó
 * @param expiryDate Fecha de vencimiento en formato ISO (YYYY-MM-DD)
 * @returns true si la fecha ya pasó, false en caso contrario
 */
export function isExpired(expiryDate: string): boolean {
  return getDaysUntilExpiry(expiryDate) < 0;
}

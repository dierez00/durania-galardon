import type { Bovino } from "../entities/Bovino";

/**
 * Determines if a bovino is eligible for export/REEMO.
 * Rules (Módulo 2 & 3):
 * - Animal must be active
 * - TB test: vigente AND result negative
 * - BR test: vigente AND result negative
 * - No active sanitary alert (positivo / prueba_vencida / sin_pruebas)
 * - UPP must NOT be quarantined
 */
export function checkExportability(bovino: Bovino): boolean {
  if (bovino.status !== "active") return false;
  if (bovino.upp_status === "quarantined") return false;

  const { sanitary } = bovino;
  if (!sanitary) return false;

  const tbOk =
    sanitary.tb_status === "vigente" && sanitary.tb_result === "negative";
  const brOk =
    sanitary.br_status === "vigente" && sanitary.br_result === "negative";

  return tbOk && brOk;
}

export function exportabilityReason(bovino: Bovino): string {
  if (bovino.status !== "active") return "Animal inactivo";
  if (bovino.upp_status === "quarantined") return "UPP en cuarentena";

  const { sanitary } = bovino;
  if (!sanitary) return "Sin datos sanitarios";

  if (sanitary.tb_result === "positive") return "TB positivo";
  if (sanitary.br_result === "positive") return "BR positivo";
  if (sanitary.tb_status === "vencida") return "Prueba TB vencida";
  if (sanitary.br_status === "vencida") return "Prueba BR vencida";
  if (sanitary.tb_status === "sin_prueba" || sanitary.tb_status === null)
    return "Sin prueba TB";
  if (sanitary.br_status === "sin_prueba" || sanitary.br_status === null)
    return "Sin prueba BR";
  if (sanitary.tb_status === "por_vencer") return "Prueba TB por vencer";
  if (sanitary.br_status === "por_vencer") return "Prueba BR por vencer";

  return "No apto";
}

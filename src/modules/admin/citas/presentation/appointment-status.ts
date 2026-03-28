import type { CitaStatus } from "@/modules/admin/citas/domain/entities/CitaEntity";

export const APPOINTMENT_STATUS_FLOW: CitaStatus[] = ["requested", "contacted", "scheduled", "discarded"];

export function getNextAppointmentStatus(status: CitaStatus): CitaStatus {
  const index = APPOINTMENT_STATUS_FLOW.indexOf(status);
  if (index === -1 || index === APPOINTMENT_STATUS_FLOW.length - 1) {
    return status;
  }

  return APPOINTMENT_STATUS_FLOW[index + 1] ?? status;
}

export function canAdvanceAppointmentStatus(status: CitaStatus): boolean {
  return getNextAppointmentStatus(status) !== status;
}

export function getAppointmentStatusLabel(status: CitaStatus): string {
  switch (status) {
    case "requested":
      return "Solicitada";
    case "contacted":
      return "Contactada";
    case "scheduled":
      return "Agendada";
    case "discarded":
      return "Descartada";
    default:
      return status;
  }
}

export function getAppointmentStatusActionLabel(status: CitaStatus): string {
  switch (status) {
    case "requested":
      return "Marcar como contactada";
    case "contacted":
      return "Marcar como agendada";
    case "scheduled":
      return "Descartar cita";
    case "discarded":
    default:
      return "Sin cambios disponibles";
  }
}

import type { ProducerUpp } from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";
import type { SemanticTone } from "@/shared/ui/theme";

export function buildMapHref(upp: ProducerUpp): string | null {
  if (upp.location_lat != null && upp.location_lng != null) {
    return `https://www.google.com/maps?q=${upp.location_lat},${upp.location_lng}`;
  }
  if (upp.address_text) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upp.address_text)}`;
  }
  return null;
}

export function statusBadgeTone(status: string): SemanticTone {
  switch (status) {
    case "active":
      return "success";
    case "quarantined":
      return "warning";
    case "suspended":
      return "neutral";
    default:
      return "info";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Activo";
    case "quarantined":
      return "Cuarentena";
    case "suspended":
      return "Suspendido";
    default:
      return status;
  }
}

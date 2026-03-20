import type { ProducerUpp } from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";

export function buildMapHref(upp: ProducerUpp): string | null {
  if (upp.location_lat != null && upp.location_lng != null) {
    return `https://www.google.com/maps?q=${upp.location_lat},${upp.location_lng}`;
  }
  if (upp.address_text) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upp.address_text)}`;
  }
  return null;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "quarantined":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "suspended":
      return "bg-gray-100 text-gray-500 border-gray-200";
    default:
      return "bg-blue-100 text-blue-700 border-blue-200";
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

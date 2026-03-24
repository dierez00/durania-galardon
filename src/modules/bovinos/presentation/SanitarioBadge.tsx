import { Badge } from "@/shared/ui/badge";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

const toneMap: Record<string, SemanticTone> = {
  // Animal status
  Limpio: "success",
  Cuarentena: "warning",
  Reactor: "error",
  // DB-level: sanitary_alert values
  ok: "success",
  positivo: "error",
  prueba_vencida: "error",
  sin_pruebas: "neutral",
  por_vencer: "warning",
  cuarentena: "warning",
  inactivo: "neutral",
  // Misc
  Negativo: "success",
  Positivo: "error",
  negative: "success",
  positive: "error",
  active: "success",
  blocked: "error",
  in_transit: "info",
  Aprobado: "success",
  "En proceso": "info",
  Pendiente: "warning",
};

const labelMap: Record<string, string> = {
  ok: "Limpio",
  positivo: "Reactor",
  prueba_vencida: "Prueba vencida",
  sin_pruebas: "Sin pruebas",
  por_vencer: "Por vencer",
  cuarentena: "Cuarentena",
  inactivo: "Inactivo",
  negative: "Negativo",
  positive: "Positivo",
  active: "Activo",
  blocked: "Bloqueado",
  in_transit: "En tránsito",
};

export function SanitarioBadge({ estado }: { readonly estado: string }) {
  const label = labelMap[estado] ?? estado;
  return <Badge variant={toneToBadgeVariant[toneMap[estado] ?? "neutral"]}>{label}</Badge>;
}

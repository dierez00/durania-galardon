import { Badge } from "@/shared/ui/badge";

const colorMap: Record<string, string> = {
  // Animal status
  Limpio: "bg-emerald-100 text-emerald-700",
  Cuarentena: "bg-amber-100 text-amber-700",
  Reactor: "bg-red-100 text-red-700",
  // DB-level: sanitary_alert values
  ok: "bg-emerald-100 text-emerald-700",
  positivo: "bg-red-100 text-red-700",
  prueba_vencida: "bg-red-100 text-red-700",
  sin_pruebas: "bg-gray-100 text-gray-600",
  por_vencer: "bg-amber-100 text-amber-700",
  cuarentena: "bg-amber-100 text-amber-700",
  inactivo: "bg-gray-100 text-gray-500",
  // Misc
  Negativo: "bg-emerald-100 text-emerald-700",
  Positivo: "bg-red-100 text-red-700",
  negative: "bg-emerald-100 text-emerald-700",
  positive: "bg-red-100 text-red-700",
  active: "bg-emerald-100 text-emerald-700",
  blocked: "bg-red-100 text-red-700",
  in_transit: "bg-blue-100 text-blue-700",
  Aprobado: "bg-emerald-100 text-emerald-700",
  "En proceso": "bg-blue-100 text-blue-700",
  Pendiente: "bg-amber-100 text-amber-700",
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
  return (
    <Badge className={`border-0 ${colorMap[estado] ?? "bg-gray-100 text-gray-700"}`}>
      {label}
    </Badge>
  );
}

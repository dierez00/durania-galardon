import { Badge } from "@/shared/ui/badge";

const colorMap: Record<string, string> = {
  Limpio: "bg-emerald-100 text-emerald-700",
  Cuarentena: "bg-amber-100 text-amber-700",
  Reactor: "bg-red-100 text-red-700",
  Negativo: "bg-emerald-100 text-emerald-700",
  Positivo: "bg-red-100 text-red-700",
  Aprobado: "bg-emerald-100 text-emerald-700",
  "En proceso": "bg-blue-100 text-blue-700",
  Pendiente: "bg-amber-100 text-amber-700",
};

export function SanitarioBadge({ estado }: { estado: string }) {
  return (
    <Badge className={`border-0 ${colorMap[estado] || "bg-gray-100 text-gray-700"}`}>
      {estado}
    </Badge>
  );
}

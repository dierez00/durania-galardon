import { Badge } from "@/shared/ui/badge";

const colorMap: Record<string, string> = {
  Aprobado:    "bg-emerald-100 text-emerald-700",
  Rechazado:   "bg-red-100 text-red-700",
  Pendiente:   "bg-amber-100 text-amber-700",
  Negativo:    "bg-emerald-100 text-emerald-700",
  Positivo:    "bg-red-100 text-red-700",
  Completada:  "bg-emerald-100 text-emerald-700",
  "En proceso": "bg-blue-100 text-blue-700",
};

export function PruebaResultBadge({ value }: { readonly value: string }) {
  return (
    <Badge className={`border-0 ${colorMap[value] ?? "bg-gray-100 text-gray-700"}`}>
      {value}
    </Badge>
  );
}

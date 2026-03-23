import { Badge } from "@/shared/ui/badge";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

const toneMap: Record<string, SemanticTone> = {
  Aprobado: "success",
  Rechazado: "error",
  Pendiente: "warning",
  Negativo: "success",
  Positivo: "error",
  Completada: "success",
  "En proceso": "info",
};

export function PruebaResultBadge({ value }: { readonly value: string }) {
  return <Badge variant={toneToBadgeVariant[toneMap[value] ?? "neutral"]}>{value}</Badge>;
}

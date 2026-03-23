"use client";

import { Badge } from "@/shared/ui/badge";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

interface ExportacionEstadoBadgeProps {
  readonly value: string;
}

const toneMap: Record<string, SemanticTone> = {
  Aprobada: "success",
  "En revision": "info",
  Pendiente: "warning",
  Rechazada: "error",
};

export function ExportacionEstadoBadge({ value }: ExportacionEstadoBadgeProps) {
  return <Badge variant={toneToBadgeVariant[toneMap[value] ?? "neutral"]}>{value}</Badge>;
}

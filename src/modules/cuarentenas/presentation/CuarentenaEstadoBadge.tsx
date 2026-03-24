"use client";

import { Badge } from "@/shared/ui/badge";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

interface CuarentenaEstadoBadgeProps {
  readonly value: string;
}

const toneMap: Record<string, SemanticTone> = {
  Activa: "warning",
  Completada: "success",
};

export function CuarentenaEstadoBadge({ value }: CuarentenaEstadoBadgeProps) {
  return <Badge variant={toneToBadgeVariant[toneMap[value] ?? "neutral"]}>{value}</Badge>;
}

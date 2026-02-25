"use client";

import { Badge } from "@/shared/ui/badge";

interface CuarentenaEstadoBadgeProps {
  readonly value: string;
}

const colorMap: Record<string, string> = {
  Activa:     "bg-amber-100 text-amber-700",
  Completada: "bg-emerald-100 text-emerald-700",
};

export function CuarentenaEstadoBadge({ value }: CuarentenaEstadoBadgeProps) {
  return (
    <Badge className={`border-0 ${colorMap[value] ?? "bg-gray-100 text-gray-700"}`}>
      {value}
    </Badge>
  );
}

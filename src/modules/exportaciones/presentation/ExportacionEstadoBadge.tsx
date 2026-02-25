"use client";

import { Badge } from "@/shared/ui/badge";

interface ExportacionEstadoBadgeProps {
  readonly value: string;
}

const colorMap: Record<string, string> = {
  Aprobada:     "bg-emerald-100 text-emerald-700",
  "En revision": "bg-blue-100 text-blue-700",
  Pendiente:    "bg-amber-100 text-amber-700",
  Rechazada:    "bg-red-100 text-red-700",
};

export function ExportacionEstadoBadge({ value }: ExportacionEstadoBadgeProps) {
  return (
    <Badge className={`border-0 ${colorMap[value] ?? "bg-gray-100 text-gray-700"}`}>
      {value}
    </Badge>
  );
}

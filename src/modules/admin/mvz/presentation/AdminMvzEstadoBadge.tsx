"use client";

import { Badge } from "@/shared/ui/badge";

interface Props {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active:   { label: "Activo",   className: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Inactivo", className: "bg-gray-100 text-gray-500" },
};

export function AdminMvzEstadoBadge({ status }: Readonly<Props>) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <Badge className={`border-0 ${config.className}`}>
      {config.label}
    </Badge>
  );
}

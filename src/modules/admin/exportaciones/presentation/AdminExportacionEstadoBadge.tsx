"use client";

import { Badge } from "@/shared/ui/badge";

interface Props {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending_review:  { label: "En revision",      className: "bg-amber-100 text-amber-700" },
  final_approved:  { label: "Aprobada",          className: "bg-emerald-100 text-emerald-700" },
  blocked:         { label: "Bloqueada",         className: "bg-red-100 text-red-700" },
  draft:           { label: "Borrador",          className: "bg-gray-100 text-gray-500" },
};

export function AdminExportacionEstadoBadge({ status }: Props) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <Badge className={`border-0 ${config.className}`}>
      {config.label}
    </Badge>
  );
}

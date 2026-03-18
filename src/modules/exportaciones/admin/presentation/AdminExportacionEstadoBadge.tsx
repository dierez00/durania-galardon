"use client";

import { Badge } from "@/shared/ui/badge";

interface Props {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  requested:      { label: "Solicitada",         className: "bg-blue-100 text-blue-700" },
  mvz_validated:  { label: "Validada MVZ",       className: "bg-indigo-100 text-indigo-700" },
  final_approved: { label: "Aprobada",           className: "bg-emerald-100 text-emerald-700" },
  blocked:        { label: "Bloqueada",          className: "bg-red-100 text-red-700" },
  rejected:       { label: "Rechazada",          className: "bg-gray-100 text-gray-500" },
};

export function AdminExportacionEstadoBadge({ status }: Readonly<Props>) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <Badge className={`border-0 ${config.className}`}>
      {config.label}
    </Badge>
  );
}

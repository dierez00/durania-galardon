"use client";

import { Badge } from "@/shared/ui/badge";
import type { CitaStatus } from "@/modules/admin/citas/domain/entities/CitaEntity";

interface Props {
  status: CitaStatus;
}

const STATUS_MAP: Record<CitaStatus, { label: string; className: string }> = {
  requested:  { label: "Solicitada",  className: "bg-blue-100 text-blue-700" },
  contacted:  { label: "Contactada",  className: "bg-amber-100 text-amber-700" },
  scheduled:  { label: "Agendada",    className: "bg-emerald-100 text-emerald-700" },
  discarded:  { label: "Descartada",  className: "bg-gray-100 text-gray-500" },
};

export function CitaEstadoBadge({ status }: Readonly<Props>) {
  const config = STATUS_MAP[status];
  return (
    <Badge className={`border-0 ${config.className}`}>
      {config.label}
    </Badge>
  );
}

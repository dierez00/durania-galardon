"use client";

import { Badge } from "@/shared/ui/badge";

interface Props {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active:    { label: "Activa",      className: "bg-emerald-100 text-emerald-700" },
  released:  { label: "Liberada",    className: "bg-gray-100 text-gray-500" },
  suspended: { label: "Suspendida",  className: "bg-orange-100 text-orange-700" },
};

export function AdminCuarentenaEstadoBadge({ status }: Readonly<Props>) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <Badge className={`border-0 ${config.className}`}>
      {config.label}
    </Badge>
  );
}

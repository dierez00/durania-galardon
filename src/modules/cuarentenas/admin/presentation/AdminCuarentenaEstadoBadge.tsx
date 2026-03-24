"use client";

import { Badge } from "@/shared/ui/badge";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

interface Props {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; tone: SemanticTone }> = {
  active:    { label: "Activa",     tone: "warning" },
  released:  { label: "Liberada",   tone: "neutral" },
  suspended: { label: "Suspendida", tone: "error" },
};

export function AdminCuarentenaEstadoBadge({ status }: Readonly<Props>) {
  const config = STATUS_MAP[status] ?? { label: status, tone: "neutral" as const };
  return <Badge variant={toneToBadgeVariant[config.tone]}>{config.label}</Badge>;
}

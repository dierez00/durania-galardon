"use client";

import { Badge } from "@/shared/ui/badge";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

interface Props {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; tone: SemanticTone }> = {
  requested:      { label: "Solicitada", tone: "info" },
  mvz_validated:  { label: "Validada MVZ", tone: "secondary" },
  final_approved: { label: "Aprobada", tone: "success" },
  blocked:        { label: "Bloqueada", tone: "error" },
  rejected:       { label: "Rechazada", tone: "neutral" },
};

export function AdminExportacionEstadoBadge({ status }: Readonly<Props>) {
  const config = STATUS_MAP[status] ?? { label: status, tone: "neutral" as const };
  return <Badge variant={toneToBadgeVariant[config.tone]}>{config.label}</Badge>;
}

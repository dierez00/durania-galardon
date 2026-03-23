"use client";

import { Badge } from "@/shared/ui/badge";
import type { CitaStatus } from "@/modules/admin/citas/domain/entities/CitaEntity";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

interface Props {
  status: CitaStatus;
}

const STATUS_MAP: Record<CitaStatus, { label: string; tone: SemanticTone }> = {
  requested: { label: "Solicitada", tone: "info" },
  contacted: { label: "Contactada", tone: "warning" },
  scheduled: { label: "Agendada", tone: "success" },
  discarded: { label: "Descartada", tone: "neutral" },
};

export function CitaEstadoBadge({ status }: Readonly<Props>) {
  const config = STATUS_MAP[status];
  return <Badge variant={toneToBadgeVariant[config.tone]}>{config.label}</Badge>;
}

"use client";

import { Badge } from "@/shared/ui/badge";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";
import type { MvzRanchIncidentRecord } from "./types";

type IncidentStatus = MvzRanchIncidentRecord["status"];
type IncidentSeverity = MvzRanchIncidentRecord["severity"];

interface IncidentBadgeMeta {
  label: string;
  tone: SemanticTone;
}

const INCIDENT_STATUS_META: Record<IncidentStatus, IncidentBadgeMeta> = {
  open: { label: "Abierta", tone: "error" },
  in_progress: { label: "En seguimiento", tone: "warning" },
  resolved: { label: "Resuelta", tone: "success" },
  dismissed: { label: "Descartada", tone: "neutral" },
};

const INCIDENT_SEVERITY_META: Record<IncidentSeverity, IncidentBadgeMeta> = {
  low: { label: "Baja", tone: "neutral" },
  medium: { label: "Media", tone: "info" },
  high: { label: "Alta", tone: "warning" },
  critical: { label: "Cr\u00edtica", tone: "error" },
};

export function getIncidentStatusMeta(status: IncidentStatus): IncidentBadgeMeta {
  return INCIDENT_STATUS_META[status];
}

export function getIncidentSeverityMeta(severity: IncidentSeverity): IncidentBadgeMeta {
  return INCIDENT_SEVERITY_META[severity];
}

export function IncidentStatusBadge({ status }: { readonly status: IncidentStatus }) {
  const meta = getIncidentStatusMeta(status);
  return <Badge variant={toneToBadgeVariant[meta.tone]}>{meta.label}</Badge>;
}

export function IncidentSeverityBadge({ severity }: { readonly severity: IncidentSeverity }) {
  const meta = getIncidentSeverityMeta(severity);
  return <Badge variant={toneToBadgeVariant[meta.tone]}>{meta.label}</Badge>;
}

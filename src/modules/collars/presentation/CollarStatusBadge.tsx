"use client";

import { Badge } from "@/shared/ui/badge";
import type { CollarStatus } from "./types";

interface Props {
  status: CollarStatus;
  className?: string;
}

export function CollarStatusBadge({ status, className = "" }: Readonly<Props>) {
  const statusConfig: Record<
    CollarStatus,
    { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
  > = {
    active: {
      variant: "default",
      label: "Activo",
    },
    linked: {
      variant: "default",
      label: "Vinculado",
    },
    inactive: {
      variant: "secondary",
      label: "Inactivo",
    },
    unlinked: {
      variant: "outline",
      label: "Sin vincular",
    },
    suspended: {
      variant: "destructive",
      label: "Suspendido",
    },
    retired: {
      variant: "secondary",
      label: "Retirado",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

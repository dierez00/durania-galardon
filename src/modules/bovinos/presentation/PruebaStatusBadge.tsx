"use client";

import { CheckCircle2, AlertCircle, XCircle, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toneClass } from "@/shared/ui/theme";

interface PruebaStatusBadgeProps {
  readonly status: string | null;
  readonly result?: string | null;
  readonly label?: string;
}

export function PruebaStatusBadge({ status, result, label }: PruebaStatusBadgeProps) {
  const isPositive = result === "positive";

  if (!status || status === "sin_prueba") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3.5 h-3.5" />
        {label ?? "Sin prueba"}
      </span>
    );
  }

  if (isPositive) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", toneClass("error", "text"))}>
        <XCircle className="w-3.5 h-3.5" />
        {label ?? "Positivo"}
      </span>
    );
  }

  if (status === "vigente") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", toneClass("success", "text"))}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        {label ?? "Vigente"}
      </span>
    );
  }

  if (status === "por_vencer") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", toneClass("warning", "text"))}>
        <AlertCircle className="w-3.5 h-3.5" />
        {label ?? "Por vencer"}
      </span>
    );
  }

  // vencida
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", toneClass("error", "text"))}>
      <XCircle className="w-3.5 h-3.5" />
      {label ?? "Vencida"}
    </span>
  );
}

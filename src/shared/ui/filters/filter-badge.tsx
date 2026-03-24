"use client";

import React from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toneClass, type SemanticTone } from "@/shared/ui/theme";

// ─── FilterBadge ──────────────────────────────────────────────────────────────
interface FilterBadgeProps {
  icon?: LucideIcon;
  label: string;
  value: string;
  onRemove: () => void;
  tone?: SemanticTone;
}

/**
 * Chip de filtro activo con botón de eliminación individual.
 */
export const FilterBadge: React.FC<FilterBadgeProps> = ({
  icon: Icon,
  label,
  value,
  onRemove,
  tone = "brand",
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
      toneClass(tone, "chip")
    )}
  >
    {Icon && <Icon className="w-3 h-3 shrink-0" />}
    <span className="text-xs">
      {label}: <strong>{value}</strong>
    </span>
    <button
      type="button"
      onClick={onRemove}
      className="ml-1 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
      aria-label={`Remover filtro ${label}`}
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

// ─── ActiveFiltersIndicator ───────────────────────────────────────────────────
interface ActiveFiltersIndicatorProps {
  children: React.ReactNode;
  onClearAll: () => void;
  className?: string;
}

/**
 * Banda que muestra los filtros activos como chips (FilterBadge) con opción
 * de limpiarlos todos a la vez.
 */
export const ActiveFiltersIndicator: React.FC<ActiveFiltersIndicatorProps> = ({
  children,
  onClearAll,
  className,
}) => (
  <div
    className={cn(
      "mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-2",
      className
    )}
  >
    <span className="text-xs text-muted-foreground font-medium shrink-0">
      Filtros activos:
    </span>
    {children}
    <button
      type="button"
      onClick={onClearAll}
      className="ml-auto whitespace-nowrap text-xs font-medium text-error hover:underline"
    >
      Limpiar todos
    </button>
  </div>
);

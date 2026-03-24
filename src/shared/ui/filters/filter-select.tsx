"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

export interface FilterOptionGroup {
  label: string;
  options: FilterOption[];
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[] | FilterOptionGroup[];
  placeholder?: string;
  icon?: LucideIcon;
  /** Devuelve una clase de color Tailwind para el icono según el valor activo */
  getOptionColor?: (value: string) => string;
  className?: string;
}

const isGroup = (
  item: FilterOption | FilterOptionGroup
): item is FilterOptionGroup => "options" in item;

// ─── Sub-componentes internos ─────────────────────────────────────────────────

/** Encabezado de grupo de opciones (no exportado, uso interno de FilterSelect). */
const FilterGroupHeader: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
    {label}
  </div>
);

/** Ítem individual de opción con soporte de icono (no exportado). */
const FilterOptionItem: React.FC<{ option: FilterOption }> = ({ option }) => (
  <SelectItem value={option.value}>
    <span className="flex items-center gap-2">
      {option.icon && <option.icon className="w-3.5 h-3.5" />}
      {option.label}
    </span>
  </SelectItem>
);

/**
 * Select de filtro genérico con soporte de icono dinámico, grupos de opciones
 * y coloración del icono según valor. Usa los componentes Select de Shadcn.
 *
 * ⚠️ Nunca uses value="" en un SelectItem — usa un valor centinela ("all", "none", etc.)
 *    y mapéalo a "" en el onChange del padre cuando quieras "sin filtro".
 */
export const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  icon: Icon,
  getOptionColor,
  className,
}) => {
  // Valor seguro para el Select: si viene "" usamos el centinela "__all__"
  const safeValue = value || "__all__";

  const iconColorClass = (() => {
    if (getOptionColor && value) return getOptionColor(value);
    if (value) return "text-primary";
    return "text-muted-foreground";
  })();

  return (
    <div className={cn("relative min-w-40", className)}>
      {/* Icono de prefijo del trigger */}
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <Icon className={cn("w-4 h-4 transition-colors", iconColorClass)} />
        </div>
      )}

      <Select
        value={safeValue}
        onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger className={cn("h-10 bg-background", Icon ? "pl-9" : "")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {/* Opción "Todos" con valor centinela */}
          <SelectItem value="__all__">{placeholder}</SelectItem>

          {options.map((item) =>
            isGroup(item) ? (
              <React.Fragment key={`group-${item.label}`}>
                <FilterGroupHeader label={item.label} />
                {item.options.map((opt) => (
                  <FilterOptionItem key={opt.value} option={opt} />
                ))}
              </React.Fragment>
            ) : (
              <FilterOptionItem key={item.value} option={item} />
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

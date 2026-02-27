"use client";

import React, { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

/** Alias reexportable para que otros módulos no dependan de react-day-picker directamente */
export type { DateRange } from "react-day-picker";
export type DateRangeValue = DateRange;

const fmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });
const fmtShort = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

function formatRange(range: DateRangeValue | undefined): string {
  if (!range?.from) return "";
  if (!range.to) return fmt.format(range.from);
  return `${fmtShort.format(range.from)} – ${fmt.format(range.to)}`;
}

interface DateRangeFilterProps {
  value: DateRangeValue | undefined;
  onChange: (range: DateRangeValue | undefined) => void;
  placeholder?: string;
  /** Número de meses visibles en el calendario (default 2) */
  numberOfMonths?: number;
  className?: string;
}

/**
 * Campo de rango de fechas: un solo botón trigger que abre un popover con
 * un calendario de selección de rango (react-day-picker mode="range").
 * Incluye botón × para limpiar la selección.
 * Reutilizable en cualquier módulo que necesite filtrado por periodo.
 */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  placeholder = "Seleccionar periodo...",
  numberOfMonths = 2,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const hasValue = Boolean(value?.from);
  const label = formatRange(value) || placeholder;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative inline-flex items-center", className)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 justify-start gap-2 pr-8 text-sm font-normal bg-background",
              !hasValue && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>

        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Borrar rango de fechas"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <PopoverContent
        className="w-auto p-0"
        align="start"
        onInteractOutside={() => setOpen(false)}
      >
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
};


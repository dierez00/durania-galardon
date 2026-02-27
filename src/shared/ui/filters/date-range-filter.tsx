"use client";

import React, { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export type { DateRange } from "react-day-picker";
export type DateRangeValue = DateRange;

const fmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });
const fmtShort = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

function formatRange(range: DateRangeValue | undefined): string {
  if (!range?.from) return "";
  if (!range.to) return fmt.format(range.from);
  return `${fmtShort.format(range.from)} - ${fmt.format(range.to)}`;
}

interface DateRangeFilterProps {
  value?: DateRangeValue | undefined;
  onChange?: (range: DateRangeValue | undefined) => void;
  placeholder?: string;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (value: string) => void;
  onEndDateChange?: (value: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  numberOfMonths?: number;
  className?: string;
}

function parseIsoDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  placeholder,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "Desde",
  endPlaceholder = "Hasta",
  numberOfMonths = 2,
  className,
}) => {
  const [open, setOpen] = useState(false);

  const resolvedValue: DateRangeValue | undefined =
    value !== undefined || onChange
      ? value
      : {
          from: parseIsoDate(startDate),
          to: parseIsoDate(endDate),
        };

  const resolvedPlaceholder = placeholder ?? `${startPlaceholder} - ${endPlaceholder}`;
  const hasValue = Boolean(resolvedValue?.from);
  const label = formatRange(resolvedValue) || resolvedPlaceholder;

  const handleSelect = (range: DateRangeValue | undefined) => {
    if (onChange) {
      onChange(range);
      return;
    }

    onStartDateChange?.(toIsoDate(range?.from));
    onEndDateChange?.(toIsoDate(range?.to));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (onChange) {
      onChange(undefined);
      return;
    }

    onStartDateChange?.("");
    onEndDateChange?.("");
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

      <PopoverContent className="w-auto p-0" align="start" onInteractOutside={() => setOpen(false)}>
        <Calendar
          mode="range"
          selected={resolvedValue}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
};

"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  className?: string;
}

/**
 * Par de inputs de fecha (inicio / fin) con icono Calendar de Lucide.
 * Usa Input de Shadcn para coherencia con el resto del sistema.
 */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "Fecha inicio",
  endPlaceholder = "Fecha fin",
  className,
}) => (
  <div className={cn("flex gap-2 flex-wrap", className)}>
    <div className="relative">
      <Calendar
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors",
          startDate ? "text-emerald-600" : "text-muted-foreground"
        )}
      />
      <Input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        placeholder={startPlaceholder}
        className="pl-9 h-10 bg-background"
      />
    </div>

    <div className="relative">
      <Calendar
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors",
          endDate ? "text-red-500" : "text-muted-foreground"
        )}
      />
      <Input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        placeholder={endPlaceholder}
        className="pl-9 h-10 bg-background"
      />
    </div>
  </div>
);

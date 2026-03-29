"use client";

import React from "react";
import { Clock3, X } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

interface TimeRangeFilterProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  className?: string;
}

export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  startPlaceholder = "Hora inicio",
  endPlaceholder = "Hora fin",
  className,
}) => {
  const hasAnyValue = Boolean(startTime || endTime);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2",
        className
      )}
    >
      <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="time"
          step={60}
          value={startTime}
          onChange={(event) => onStartTimeChange(event.target.value)}
          max={endTime || undefined}
          className="h-8 w-[120px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          aria-label={startPlaceholder}
        />
        <span className="text-xs text-muted-foreground">a</span>
        <Input
          type="time"
          step={60}
          value={endTime}
          onChange={(event) => onEndTimeChange(event.target.value)}
          min={startTime || undefined}
          className="h-8 w-[120px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          aria-label={endPlaceholder}
        />
      </div>

      {hasAnyValue ? (
        <button
          type="button"
          onClick={() => {
            onStartTimeChange("");
            onEndTimeChange("");
          }}
          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Borrar rango de horas"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
};
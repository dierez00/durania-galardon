"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toneClass } from "@/shared/ui/theme";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

interface ExportableCheckBadgeProps {
  readonly canExport: boolean;
  readonly reason?: string;
}

export function ExportableCheckBadge({ canExport, reason }: ExportableCheckBadgeProps) {
  if (canExport) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium cursor-default",
                toneClass("success", "text")
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apto
            </span>
          </TooltipTrigger>
          <TooltipContent>Apto para exportación / REEMO</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 text-xs cursor-default", toneClass("error", "text"))}>
            <XCircle className="w-3.5 h-3.5" />
            No apto
          </span>
        </TooltipTrigger>
        <TooltipContent>{reason ?? "No cumple criterios sanitarios"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

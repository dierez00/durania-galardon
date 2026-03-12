"use client";

import { CheckCircle2, XCircle } from "lucide-react";
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
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium cursor-default">
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
          <span className="inline-flex items-center gap-1 text-xs text-red-600 cursor-default">
            <XCircle className="w-3.5 h-3.5" />
            No apto
          </span>
        </TooltipTrigger>
        <TooltipContent>{reason ?? "No cumple criterios sanitarios"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

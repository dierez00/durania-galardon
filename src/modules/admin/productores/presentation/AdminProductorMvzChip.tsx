"use client";

import { cn } from "@/shared/lib/utils";
import { toneClass } from "@/shared/ui/theme";
import type { AdminProductorUppMvz } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

interface AdminProductorMvzChipProps {
  mvz: AdminProductorUppMvz;
  className?: string;
}

export function AdminProductorMvzChip({
  mvz,
  className,
}: Readonly<AdminProductorMvzChipProps>) {
  const isActive = mvz.mvzStatus === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        toneClass(isActive ? "info" : "neutral", "chip"),
        className
      )}
      title={`MVZ: ${mvz.fullName} — Licencia: ${mvz.licenseNumber}`}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          toneClass(isActive ? "info" : "neutral", "dot")
        )}
      />
      {mvz.fullName}
      <span className="text-[10px] font-mono opacity-70">{mvz.licenseNumber}</span>
    </span>
  );
}

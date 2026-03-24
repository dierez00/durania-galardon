"use client";

import { Home } from "lucide-react";
import { AdminMvzUppCard } from "./AdminMvzUppCard";
import { DetailEmptyState } from "@/shared/ui/detail";
import type { AdminMvzUpp } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

interface AdminMvzUppsListProps {
  upps: AdminMvzUpp[];
  loading?: boolean;
}

export function AdminMvzUppsList({
  upps,
  loading = false,
}: Readonly<AdminMvzUppsListProps>) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {["a", "b", "c"].map((k) => (
          <div
            key={k}
            className="h-44 rounded-lg bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (upps.length === 0) {
    return (
      <DetailEmptyState
        icon={Home}
        message="Este MVZ no tiene UPPs asignadas."
        description="Las UPPs se asignan a través del módulo de asignaciones territoriales."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {upps.map((upp) => (
        <AdminMvzUppCard key={upp.id} upp={upp} />
      ))}
    </div>
  );
}

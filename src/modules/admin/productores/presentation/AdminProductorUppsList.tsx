"use client";

import { Home } from "lucide-react";
import { AdminProductorUppCard } from "./AdminProductorUppCard";
import { DetailEmptyState } from "@/shared/ui/detail";
import type { AdminProductorUpp } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

interface AdminProductorUppsListProps {
  upps: AdminProductorUpp[];
  loading?: boolean;
}

export function AdminProductorUppsList({
  upps,
  loading = false,
}: Readonly<AdminProductorUppsListProps>) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {["a", "b", "c"].map((k) => (
          <div
            key={k}
            className="h-52 rounded-lg bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (upps.length === 0) {
    return (
      <DetailEmptyState
        icon={Home}
        message="Este productor no tiene UPPs / ranchos registrados."
        description="Las UPPs (Unidades de Producción Primaria) se registran a través del módulo de ranchos."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {upps.map((upp) => (
        <AdminProductorUppCard key={upp.id} upp={upp} />
      ))}
    </div>
  );
}

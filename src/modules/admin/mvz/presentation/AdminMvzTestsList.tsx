"use client";

import { FlaskConical } from "lucide-react";
import { AdminMvzTestCard } from "./AdminMvzTestCard";
import { DetailEmptyState } from "@/shared/ui/detail";
import type { AdminMvzTest } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

interface AdminMvzTestsListProps {
  tests: AdminMvzTest[];
  loading?: boolean;
}

export function AdminMvzTestsList({
  tests,
  loading = false,
}: Readonly<AdminMvzTestsListProps>) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <div
            key={k}
            className="h-32 rounded-lg bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <DetailEmptyState
        icon={FlaskConical}
        message="Este MVZ no tiene pruebas de campo registradas."
        description="Las pruebas se registran al capturar resultados desde la app móvil o el panel."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {tests.map((test) => (
        <AdminMvzTestCard key={test.id} test={test} />
      ))}
    </div>
  );
}

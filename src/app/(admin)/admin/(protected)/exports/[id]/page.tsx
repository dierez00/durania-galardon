"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminExportacionDetail } from "@/modules/exportaciones/admin/presentation/hooks/useAdminExportacionDetail";
import { AdminExportacionDetailContent } from "@/modules/exportaciones/admin/presentation/AdminExportacionDetailContent";

function resolveTab(value: string | null) {
  if (value === "animales" || value === "proceso") {
    return value;
  }

  return "info";
}

export default function AdminExportacionDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const focusStatus = searchParams.get("focus") === "status";
  const initialTab = resolveTab(searchParams.get("tab"));
  const {
    detail,
    loadingDetail,
    errorDetail,
    animals,
    loadingAnimals,
    activeTab,
    handleTabChange,
    isUpdatingStatus,
    updateError,
    updateStatus,
  } = useAdminExportacionDetail(id, { initialTab });

  if (loadingDetail) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Cargando exportacion...
      </div>
    );
  }

  if (errorDetail || !detail) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-destructive">{errorDetail || "Exportacion no encontrada."}</p>
      </div>
    );
  }

  return (
    <AdminExportacionDetailContent
      exportId={id}
      detail={detail}
      animals={animals}
      loadingAnimals={loadingAnimals}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      isUpdatingStatus={isUpdatingStatus}
      updateError={updateError}
      onUpdateStatus={updateStatus}
      focusStatus={focusStatus}
    />
  );
}

"use client";

import { use } from "react";
import { useAdminExportacionDetail } from "@/modules/exportaciones/admin/presentation/hooks/useAdminExportacionDetail";
import { AdminExportacionDetailContent } from "@/modules/exportaciones/admin/presentation/AdminExportacionDetailContent";

export default function AdminExportacionDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
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
  } = useAdminExportacionDetail(id);

  if (loadingDetail) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Cargando exportación...
      </div>
    );
  }

  if (errorDetail || !detail) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-sm text-destructive">{errorDetail || "Exportación no encontrada."}</p>
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
    />
  );
}


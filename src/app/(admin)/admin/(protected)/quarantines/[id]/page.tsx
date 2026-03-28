"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminCuarentenaDetail } from "@/modules/cuarentenas/admin/presentation/hooks/useAdminCuarentenaDetail";
import { AdminCuarentenaDetailContent } from "@/modules/cuarentenas/admin/presentation/AdminCuarentenaDetailContent";

function resolveTab(value: string | null) {
  if (value === "upp" || value === "mapa" || value === "historial") {
    return value;
  }

  return "resumen";
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminQuarantineDetailPage({ params }: Readonly<Props>) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const initialTab = resolveTab(searchParams.get("tab"));
  const focusStatus = searchParams.get("focus") === "status";
  const detailProps = useAdminCuarentenaDetail(id, { initialTab });
  return <AdminCuarentenaDetailContent {...detailProps} focusStatus={focusStatus} />;
}

"use client";

import { use } from "react";
import { useAdminCuarentenaDetail } from "@/modules/admin/cuarentenas/presentation/hooks/useAdminCuarentenaDetail";
import { AdminCuarentenaDetailContent } from "@/modules/admin/cuarentenas/presentation/AdminCuarentenaDetailContent";

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminQuarantineDetailPage({ params }: Readonly<Props>) {
  const { id } = use(params);
  const detailProps = useAdminCuarentenaDetail(id);
  return <AdminCuarentenaDetailContent {...detailProps} />;
}

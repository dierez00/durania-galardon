"use client";

import { use } from "react";
import { useAdminCuarentenaDetail } from "@/modules/cuarentenas/admin/presentation/hooks/useAdminCuarentenaDetail";
import { AdminCuarentenaDetailContent } from "@/modules/cuarentenas/admin/presentation/AdminCuarentenaDetailContent";

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminQuarantineDetailPage({ params }: Readonly<Props>) {
  const { id } = use(params);
  const detailProps = useAdminCuarentenaDetail(id);
  return <AdminCuarentenaDetailContent {...detailProps} />;
}


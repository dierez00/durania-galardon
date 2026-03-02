"use client";

import { use } from "react";
import {
  AdminMvzDetailContent,
  useAdminMvzDetail,
} from "@/modules/admin/mvz/presentation";

export default function AdminMvzDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const hookResult = useAdminMvzDetail(id);
  return <AdminMvzDetailContent {...hookResult} />;
}

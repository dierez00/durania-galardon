"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import {
  AdminMvzDetailContent,
  useAdminMvzDetail,
  type MvzDetailViewTab,
} from "@/modules/admin/mvz/presentation";

function resolveTab(tab: string | null, mode: string | null): MvzDetailViewTab {
  if (mode === "edit") {
    return "info";
  }

  if (tab === "info" || tab === "upps" || tab === "pruebas" || tab === "visitas") {
    return tab;
  }

  return "overview";
}

export default function AdminMvzDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const initialTab = resolveTab(searchParams.get("tab"), searchParams.get("mode"));
  const hookResult = useAdminMvzDetail(id, { initialTab });
  return <AdminMvzDetailContent {...hookResult} />;
}

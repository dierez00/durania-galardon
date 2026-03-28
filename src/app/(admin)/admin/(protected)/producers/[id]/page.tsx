"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import {
  AdminProductorDetailContent,
  useAdminProductorDetail,
  type ProductorDetailViewTab,
} from "@/modules/admin/productores/presentation";

function resolveTab(tab: string | null, mode: string | null): ProductorDetailViewTab {
  if (mode === "edit") {
    return "info";
  }

  if (tab === "info" || tab === "upps" || tab === "documentos" || tab === "visitas") {
    return tab;
  }

  return "overview";
}

export default function AdminProductorDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const initialTab = resolveTab(searchParams.get("tab"), searchParams.get("mode"));
  const hookResult = useAdminProductorDetail(id, { initialTab });

  return <AdminProductorDetailContent {...hookResult} />;
}

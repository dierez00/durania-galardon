"use client";

import { use } from "react";
import {
  AdminProductorDetailContent,
  useAdminProductorDetail,
} from "@/modules/admin/productores/presentation";

export default function AdminProductorDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const hookResult = useAdminProductorDetail(id);
  return <AdminProductorDetailContent {...hookResult} />;

}

"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import {
  AdminAppointmentDetailContent,
  useAdminAppointmentDetail,
  type AppointmentDetailTab,
} from "@/modules/admin/citas/presentation";

function resolveTab(value: string | null): AppointmentDetailTab {
  if (value === "notes") {
    return "notes";
  }

  return "overview";
}

export default function AdminAppointmentDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const initialTab = resolveTab(searchParams.get("tab"));
  const focusStatus = searchParams.get("focus") === "status";
  const hookResult = useAdminAppointmentDetail(id, { initialTab });

  return <AdminAppointmentDetailContent {...hookResult} focusStatus={focusStatus} />;
}

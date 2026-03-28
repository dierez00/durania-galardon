import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

type DashboardAppointmentStatus = "requested" | "contacted" | "scheduled" | "discarded";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.dashboard.read"],
    resource: "admin.dashboard",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const [producersResult, mvzResult, exportsResult, quarantinesResult, appointmentsResult] = await Promise.all([
    supabaseAdmin.from("v_producers_admin").select("producer_id,total_upps,producer_status"),
    supabaseAdmin.from("v_mvz_admin").select("mvz_profile_id,active_assignments,mvz_status"),
    supabaseAdmin
      .from("export_requests")
      .select("id,status,monthly_bucket,created_at")
      .order("monthly_bucket", { ascending: true }),
    supabaseAdmin
      .from("state_quarantines")
      .select("id,status")
      .eq("declared_by_tenant_id", auth.context.user.tenantId)
      .eq("status", "active"),
    supabaseAdmin
      .from("appointment_requests")
      .select("id,full_name,requested_service,requested_date,requested_time,status,created_at")
      .eq("tenant_id", auth.context.user.tenantId)
      .order("created_at", { ascending: false }),
  ]);

  if (
    producersResult.error ||
    mvzResult.error ||
    exportsResult.error ||
    quarantinesResult.error ||
    appointmentsResult.error
  ) {
    return apiError("ADMIN_DASHBOARD_QUERY_FAILED", "No fue posible obtener KPIs globales.", 500, {
      producers: producersResult.error?.message,
      mvz: mvzResult.error?.message,
      exports: exportsResult.error?.message,
      quarantines: quarantinesResult.error?.message,
      appointments: appointmentsResult.error?.message,
    });
  }

  const producerRows = (producersResult.data ?? []) as Array<{
    total_upps: number | null;
    producer_status: string | null;
  }>;
  const mvzRows = (mvzResult.data ?? []) as Array<{
    active_assignments: number | null;
    mvz_status: string | null;
  }>;
  const exportRequests = (exportsResult.data ?? []) as Array<{
    status: string | null;
    monthly_bucket: string | null;
    created_at: string;
  }>;
  const activeQuarantines = quarantinesResult.data ?? [];
  const appointments = (appointmentsResult.data ?? []) as Array<{
    id: string;
    full_name: string;
    requested_service: string;
    requested_date: string | null;
    requested_time: string | null;
    status: DashboardAppointmentStatus;
    created_at: string;
  }>;

  const totalUpps = producerRows.reduce((sum, row) => sum + (row.total_upps ?? 0), 0);
  const activeProducers = producerRows.filter((row) => row.producer_status === "active").length;
  const activeMvz = mvzRows.filter((row) => row.mvz_status === "active").length;
  const pendingExports = exportRequests.filter(
    (row) => row.status === "requested" || row.status === "mvz_validated"
  ).length;
  const pendingAppointments = appointments.filter(
    (row) => row.status === "requested" || row.status === "contacted"
  ).length;

  const now = new Date();
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const cursor = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

    return {
      key,
      label: cursor.toLocaleDateString("es-MX", {
        month: "short",
        year: "2-digit",
      }),
    };
  });

  const exportsByMonth = exportRequests.reduce<Record<string, number>>((acc, row) => {
    const bucketSource = row.monthly_bucket ?? row.created_at;
    const bucketDate = new Date(bucketSource);
    if (Number.isNaN(bucketDate.getTime())) {
      return acc;
    }

    const key = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const appointmentsByStatus = appointments.reduce<Record<DashboardAppointmentStatus, number>>(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    {
      requested: 0,
      contacted: 0,
      scheduled: 0,
      discarded: 0,
    }
  );

  return apiSuccess({
    kpis: {
      totalUpps,
      activeProducers,
      activeMvz,
      pendingExports,
      activeQuarantines: activeQuarantines.length,
      pendingAppointments,
    },
    charts: {
      exportsByMonth: monthKeys.map((item) => ({
        period: item.label,
        total: exportsByMonth[item.key] ?? 0,
      })),
      appointmentsByStatus: [
        { key: "requested", label: "Solicitadas", total: appointmentsByStatus.requested },
        { key: "contacted", label: "Contactadas", total: appointmentsByStatus.contacted },
        { key: "scheduled", label: "Agendadas", total: appointmentsByStatus.scheduled },
        { key: "discarded", label: "Descartadas", total: appointmentsByStatus.discarded },
      ],
    },
    appointmentsPreview: appointments.slice(0, 5),
  });
}

import {
  createSupabaseRlsServerClient,
  getSupabaseAdminClient,
} from "@/server/auth/supabase";

export interface UpdateAppointmentBody {
  id?: string;
  status?: "requested" | "contacted" | "scheduled" | "discarded";
}

export interface CreateAppointmentBody {
  fullName?: string;
  phone?: string;
  email?: string;
  requestedService?: string;
  requestedDate?: string;
  requestedTime?: string;
  notes?: string;
}

export const APPOINTMENTS_SELECT =
  "id,full_name,phone,email,requested_service,requested_date,requested_time,notes,status,created_at";

export const VALID_APPOINTMENT_STATUS = new Set([
  "requested",
  "contacted",
  "scheduled",
  "discarded",
]);

export function normalizeCreateAppointmentBody(body: CreateAppointmentBody) {
  return {
    fullName: body.fullName?.trim(),
    phone: body.phone?.trim() || null,
    email: body.email?.trim().toLowerCase() || null,
    requestedService: body.requestedService?.trim(),
    requestedDate: body.requestedDate?.trim() || null,
    requestedTime: body.requestedTime?.trim() || null,
    notes: body.notes?.trim() || null,
  };
}

export async function listTenantAppointments(accessToken: string, tenantId: string) {
  const supabase = createSupabaseRlsServerClient(accessToken);
  return supabase
    .from("appointment_requests")
    .select(APPOINTMENTS_SELECT)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
}

export async function updateTenantAppointmentStatus(
  accessToken: string,
  tenantId: string,
  id: string,
  status: string
) {
  const supabase = createSupabaseRlsServerClient(accessToken);
  return supabase
    .from("appointment_requests")
    .update({ status })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("id,status")
    .maybeSingle();
}

export async function createPublicAppointment(
  tenantId: string,
  input: ReturnType<typeof normalizeCreateAppointmentBody>
) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin
    .from("appointment_requests")
    .insert({
      tenant_id: tenantId,
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
      requested_service: input.requestedService,
      requested_date: input.requestedDate,
      requested_time: input.requestedTime,
      notes: input.notes,
      status: "requested",
    })
    .select("id,status,created_at")
    .single();
}

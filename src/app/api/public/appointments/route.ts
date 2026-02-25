import { resolveTenantContextFromRequest } from "@/server/auth";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { apiError, apiSuccess } from "@/shared/lib/api-response";

interface CreateAppointmentBody {
  fullName?: string;
  phone?: string;
  email?: string;
  requestedService?: string;
  requestedDate?: string;
  requestedTime?: string;
  notes?: string;
}

export async function POST(request: Request) {
  const tenantResult = await resolveTenantContextFromRequest(request);
  if ("error" in tenantResult) {
    return apiError(tenantResult.error.code, tenantResult.error.message, tenantResult.error.status);
  }

  let body: CreateAppointmentBody;
  try {
    body = (await request.json()) as CreateAppointmentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const fullName = body.fullName?.trim();
  const requestedService = body.requestedService?.trim();
  const phone = body.phone?.trim() || null;
  const email = body.email?.trim().toLowerCase() || null;
  const requestedDate = body.requestedDate?.trim() || null;
  const requestedTime = body.requestedTime?.trim() || null;
  const notes = body.notes?.trim() || null;

  if (!fullName || !requestedService) {
    return apiError("INVALID_PAYLOAD", "fullName y requestedService son requeridos.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const insertResult = await supabaseAdmin
    .from("appointment_requests")
    .insert({
      tenant_id: tenantResult.tenant.tenantId,
      full_name: fullName,
      phone,
      email,
      requested_service: requestedService,
      requested_date: requestedDate,
      requested_time: requestedTime,
      notes,
      status: "requested",
    })
    .select("id,status,created_at")
    .single();

  if (insertResult.error || !insertResult.data) {
    return apiError(
      "APPOINTMENT_CREATE_FAILED",
      insertResult.error?.message ?? "No fue posible registrar la solicitud de cita.",
      400
    );
  }

  return apiSuccess(
    {
      appointment: insertResult.data,
      tenantSlug: tenantResult.tenant.tenantSlug,
    },
    { status: 201 }
  );
}

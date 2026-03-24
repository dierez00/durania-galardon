import { resolveTenantContextFromRequest } from "@/server/auth";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import {
  createPublicAppointment,
  CreateAppointmentBody,
  normalizeCreateAppointmentBody,
} from "@/modules/admin/citas/infra/http/shared";

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

  const normalizedBody = normalizeCreateAppointmentBody(body);
  if (!normalizedBody.fullName || !normalizedBody.requestedService) {
    return apiError("INVALID_PAYLOAD", "fullName y requestedService son requeridos.");
  }

  const insertResult = await createPublicAppointment(tenantResult.tenant.tenantId, normalizedBody);
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

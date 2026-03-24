import { requireAuthorized } from "@/server/authz";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";
import {
  listTenantAppointments,
  UpdateAppointmentBody,
  updateTenantAppointmentStatus,
  VALID_APPOINTMENT_STATUS,
} from "@/modules/admin/citas/infra/http/shared";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.appointments.read"],
    resource: "admin.appointments",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const appointmentsResult = await listTenantAppointments(
    auth.context.user.accessToken,
    auth.context.user.tenantId
  );

  if (appointmentsResult.error) {
    return apiError("APPOINTMENTS_QUERY_FAILED", appointmentsResult.error.message, 500);
  }

  return apiSuccess({ appointments: appointmentsResult.data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.appointments.write"],
    resource: "admin.appointments",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: UpdateAppointmentBody;
  try {
    body = (await request.json()) as UpdateAppointmentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  const status = body.status;

  if (!id || !status || !VALID_APPOINTMENT_STATUS.has(status)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id y status valido.");
  }

  const updateResult = await updateTenantAppointmentStatus(
    auth.context.user.accessToken,
    auth.context.user.tenantId,
    id,
    status
  );

  if (updateResult.error) {
    return apiError("APPOINTMENT_UPDATE_FAILED", updateResult.error.message, 400);
  }
  if (!updateResult.data) {
    return apiError("APPOINTMENT_NOT_FOUND", "No existe cita en este tenant con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "admin.appointments",
    resourceId: id,
    payload: { status },
  });

  return apiSuccess({ appointment: updateResult.data });
}

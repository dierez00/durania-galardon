import { requireAuthorized } from "@/server/authz";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";
import {
  getTenantAppointmentById,
  type UpdateAppointmentBody,
  updateTenantAppointmentStatus,
  VALID_APPOINTMENT_STATUS,
} from "@/modules/admin/citas/infra/http/shared";

interface AppointmentPatchBody {
  status?: UpdateAppointmentBody["status"];
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.appointments.read"],
    resource: "admin.appointments",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const appointmentResult = await getTenantAppointmentById(
    auth.context.user.accessToken,
    auth.context.user.tenantId,
    id
  );

  if (appointmentResult.error) {
    return apiError("APPOINTMENT_QUERY_FAILED", appointmentResult.error.message, 500);
  }

  if (!appointmentResult.data) {
    return apiError("APPOINTMENT_NOT_FOUND", "No existe cita en este tenant con ese id.", 404);
  }

  return apiSuccess({ appointment: appointmentResult.data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.appointments.write"],
    resource: "admin.appointments",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  let body: AppointmentPatchBody;
  try {
    body = (await request.json()) as AppointmentPatchBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const status = body.status;
  if (!status || !VALID_APPOINTMENT_STATUS.has(status)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar un status valido.");
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
    action: "status_change",
    resource: "admin.appointments",
    resourceId: id,
    payload: { status },
  });

  const appointmentResult = await getTenantAppointmentById(
    auth.context.user.accessToken,
    auth.context.user.tenantId,
    id
  );

  if (appointmentResult.error) {
    return apiError("APPOINTMENT_QUERY_FAILED", appointmentResult.error.message, 500);
  }

  return apiSuccess({ appointment: appointmentResult.data ?? updateResult.data });
}

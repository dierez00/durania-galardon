import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import {
  fetchAuthUserLifecycleSnapshot,
  resendAuthOnboardingEmail,
} from "@/server/auth/provisioning";
import { logAuditEvent } from "@/server/audit";
import { buildSetPasswordRedirectUrl } from "@/modules/auth/shared/redirects";

interface ResendInviteBody {
  membershipId?: string;
}

function canResendInvite(input: {
  membershipStatus: string;
  profileStatus: string | null | undefined;
  authLifecycle: {
    invitedAt: string | null;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
  } | null;
}) {
  if (input.membershipStatus === "inactive" || input.membershipStatus === "suspended") {
    return false;
  }

  if (input.profileStatus === "blocked") {
    return false;
  }

  if (input.authLifecycle?.invitedAt && !input.authLifecycle.emailConfirmedAt) {
    return true;
  }

  if (input.authLifecycle?.emailConfirmedAt && !input.authLifecycle.lastSignInAt) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.employees.write"],
    resource: "producer.employees.resend_invite",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ResendInviteBody;
  try {
    body = (await request.json()) as ResendInviteBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const membershipId = body.membershipId?.trim();
  if (!membershipId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar membershipId.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const membershipResult = await supabaseAdmin
    .from("tenant_memberships")
    .select("id,user_id,status")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipResult.error || !membershipResult.data) {
    return apiError("EMPLOYEE_MEMBERSHIP_NOT_FOUND", "No existe membresia con ese id.", 404);
  }

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("email,status")
    .eq("id", membershipResult.data.user_id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data?.email) {
    return apiError("EMPLOYEE_PROFILE_NOT_FOUND", "No fue posible resolver el correo del empleado.", 404);
  }

  const authLifecycle = await fetchAuthUserLifecycleSnapshot(membershipResult.data.user_id);
  if (
    !canResendInvite({
      membershipStatus: membershipResult.data.status,
      profileStatus: profileResult.data.status,
      authLifecycle,
    })
  ) {
    return apiError(
      "EMPLOYEE_INVITE_RESEND_NOT_ALLOWED",
      "Solo puedes reenviar acceso a empleados con onboarding pendiente.",
      400
    );
  }

  let deliveryType: "invite" | "recovery";
  try {
    deliveryType = await resendAuthOnboardingEmail({
      userId: membershipResult.data.user_id,
      email: profileResult.data.email,
      redirectTo: buildSetPasswordRedirectUrl(),
    });
  } catch (error) {
    return apiError(
      "EMPLOYEE_INVITE_RESEND_FAILED",
      error instanceof Error ? error.message : "No fue posible reenviar el acceso.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "producer.employees",
    resourceId: membershipId,
    payload: {
      email: profileResult.data.email,
      deliveryType,
      operation: "resend_invite",
    },
  });

  return apiSuccess({
    membershipId,
    email: profileResult.data.email,
    deliveryType,
  });
}

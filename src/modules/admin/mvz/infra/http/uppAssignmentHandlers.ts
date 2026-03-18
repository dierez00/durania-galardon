import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { UnassignMvzUppUseCase } from "@/modules/admin/mvz/application/use-cases/UnassignMvzUpp";
import { ServerAdminMvzDetailRepository } from "@/modules/admin/mvz/infra/supabase/ServerAdminMvzDetailRepository";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; uppId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id, uppId } = await params;
  const repository = new ServerAdminMvzDetailRepository(auth.context.user.id);
  const useCase = new UnassignMvzUppUseCase(repository);

  try {
    await useCase.execute(id, uppId);
  } catch (error) {
    return apiError(
      "ADMIN_MVZ_UPP_UNASSIGN_FAILED",
      error instanceof Error ? error.message : "No fue posible desasignar rancho.",
      500
    );
  }

  await logAuditEvent({
    request,
    action: "status_change",
    resource: "mvz_upp_assignment",
    payload: { mvz_profile_id: id, upp_id: uppId, status: "inactive" },
    user: auth.context.user,
  });

  return apiSuccess({});
}

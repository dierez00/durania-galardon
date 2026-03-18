import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { AssignMvzUppUseCase } from "@/modules/admin/mvz/application/use-cases/AssignMvzUpp";
import { GetAdminMvzAvailableUppsUseCase } from "@/modules/admin/mvz/application/use-cases/GetAdminMvzAvailableUpps";
import { GetAdminMvzUppsUseCase } from "@/modules/admin/mvz/application/use-cases/GetAdminMvzUpps";
import { ServerAdminMvzDetailRepository } from "@/modules/admin/mvz/infra/supabase/ServerAdminMvzDetailRepository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.read"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const mode = new URL(request.url).searchParams.get("mode");
  const repository = new ServerAdminMvzDetailRepository(auth.context.user.id);

  try {
    if (mode === "available") {
      const useCase = new GetAdminMvzAvailableUppsUseCase(repository);
      const upps = await useCase.execute(id);
      return apiSuccess({ upps });
    }

    const useCase = new GetAdminMvzUppsUseCase(repository);
    const upps = await useCase.execute(id);
    return apiSuccess({ upps });
  } catch (error) {
    return apiError(
      mode === "available" ? "ADMIN_MVZ_UPPS_AVAILABLE_QUERY_FAILED" : "ADMIN_MVZ_UPPS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar UPPs.",
      500
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { uppId?: string };

  if (!body.uppId) {
    return apiError("ADMIN_MVZ_UPP_ASSIGN_MISSING_UPP", "uppId is required", 400);
  }

  const repository = new ServerAdminMvzDetailRepository(auth.context.user.id);
  const useCase = new AssignMvzUppUseCase(repository);

  try {
    await useCase.execute(id, body.uppId);
  } catch (error) {
    return apiError(
      "ADMIN_MVZ_UPP_ASSIGN_FAILED",
      error instanceof Error ? error.message : "No fue posible asignar rancho.",
      500
    );
  }

  await logAuditEvent({
    request,
    action: "create",
    resource: "mvz_upp_assignment",
    payload: { mvz_profile_id: id, upp_id: body.uppId },
    user: auth.context.user,
  });

  return apiSuccess({ ok: true });
}

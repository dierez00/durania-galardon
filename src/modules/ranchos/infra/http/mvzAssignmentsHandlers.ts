import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import { listMvzAssignments } from "@/modules/ranchos/infra/api/mvzAssignments";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.assignments.read"],
    resource: "mvz.assignments",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const mvzProfileId = await resolveMvzProfileId(auth.context.user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para el usuario.", 403);
  }

  try {
    const assignments = await listMvzAssignments(mvzProfileId);
    return apiSuccess({ assignments });
  } catch (error) {
    return apiError(
      "MVZ_ASSIGNMENTS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar asignaciones.",
      500
    );
  }
}

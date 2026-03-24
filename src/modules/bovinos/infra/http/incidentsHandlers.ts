import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { ServerBovinoRepository } from "@/modules/bovinos/infra/supabase/ServerBovinoRepository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.read"],
    resource: "producer.bovinos",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const repository = new ServerBovinoRepository(auth.context.user.tenantId);
  const bovino = await repository.getById(id);

  if (!bovino) {
    return apiError("NOT_FOUND", "Bovino no encontrado.", 404);
  }
  if (!(await auth.context.canAccessUpp(bovino.upp_id))) {
    return apiError("FORBIDDEN", "No tiene acceso a este bovino.", 403);
  }

  try {
    const incidents = await repository.listIncidents(id);
    return apiSuccess({ incidents });
  } catch (error) {
    return apiError(
      "INCIDENTS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar incidencias.",
      500
    );
  }
}

import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { ServerBovinoRepository } from "@/modules/bovinos/infra/supabase/ServerBovinoRepository";
import { toApiBovino } from "@/modules/bovinos/infra/http/shared";

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

  try {
    const bovino = await repository.getById(id);
    if (!bovino) {
      return apiError("NOT_FOUND", "Bovino no encontrado.", 404);
    }

    const canAccess = await auth.context.canAccessUpp(bovino.upp_id);
    if (!canAccess) {
      return apiError("FORBIDDEN", "No tiene acceso a este bovino.", 403);
    }

    return apiSuccess({ bovino: toApiBovino(bovino) });
  } catch (error) {
    return apiError(
      "NOT_FOUND",
      error instanceof Error ? error.message : "Bovino no encontrado.",
      404
    );
  }
}

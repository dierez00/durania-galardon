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
  const bovino = await repository.getById(id);

  if (!bovino) {
    return apiError("NOT_FOUND", "Bovino no encontrado.", 404);
  }
  if (!(await auth.context.canAccessUpp(bovino.upp_id))) {
    return apiError("FORBIDDEN", "No tiene acceso a este bovino.", 403);
  }

  try {
    const offspring = await repository.listOffspring(id);
    return apiSuccess({ offspring: offspring.map(toApiBovino) });
  } catch (error) {
    return apiError(
      "OFFSPRING_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar descendencia.",
      500
    );
  }
}

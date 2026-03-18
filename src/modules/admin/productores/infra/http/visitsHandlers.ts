import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { ServerAdminProductorDetailRepository } from "@/modules/admin/productores/infra/supabase/ServerAdminProductorDetailRepository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.read"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const page = Math.max(1, Number.parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10));
  const repository = new ServerAdminProductorDetailRepository();

  try {
    const result = await repository.getVisits(id, page);
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      "ADMIN_PRODUCER_VISITS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar visitas.",
      500
    );
  }
}

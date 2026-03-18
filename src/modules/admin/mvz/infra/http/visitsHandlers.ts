import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
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
  const page = Math.max(1, Number.parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10));
  const repository = new ServerAdminMvzDetailRepository();

  try {
    const result = await repository.getVisits(id, page);
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      "ADMIN_MVZ_VISITS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar visitas.",
      500
    );
  }
}

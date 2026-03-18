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
  const repository = new ServerAdminMvzDetailRepository();

  try {
    const tests = await repository.getTests(id);
    return apiSuccess({ tests });
  } catch (error) {
    return apiError(
      "ADMIN_MVZ_TESTS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar pruebas.",
      500
    );
  }
}

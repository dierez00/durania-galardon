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
  const repository = new ServerAdminProductorDetailRepository();

  try {
    const upps = await repository.getUpps(id);
    return apiSuccess({ upps });
  } catch (error) {
    return apiError(
      "ADMIN_UPPS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar UPPs.",
      500
    );
  }
}

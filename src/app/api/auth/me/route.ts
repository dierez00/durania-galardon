import { apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, { resource: "auth.me" });
  if (!auth.ok) {
    return auth.response;
  }

  const { user, permissions } = auth.context;

  return apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    tenant: {
      id: user.tenantId,
      slug: user.tenantSlug,
    },
    permissions,
  });
}

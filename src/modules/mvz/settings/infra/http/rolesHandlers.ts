import { apiError } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import type { PermissionKey } from "@/shared/lib/auth";

const MVZ_ROLE_MANAGEMENT_DISABLED_MESSAGE =
  "Los roles del personal MVZ se administran fuera de este panel. Gobierno da de alta a MVZ Gobierno y cada productor da de alta a MVZ Interno.";

async function authorize(request: Request, permissions: PermissionKey[]) {
  return requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions,
    resource: "mvz.roles",
  });
}

export async function GET(request: Request) {
  const auth = await authorize(request, ["mvz.roles.read"]);
  if (!auth.ok) {
    return auth.response;
  }

  return apiError("FORBIDDEN", MVZ_ROLE_MANAGEMENT_DISABLED_MESSAGE, 403);
}

export async function POST(request: Request) {
  const auth = await authorize(request, ["mvz.roles.write"]);
  if (!auth.ok) {
    return auth.response;
  }

  return apiError("FORBIDDEN", MVZ_ROLE_MANAGEMENT_DISABLED_MESSAGE, 403);
}

export async function PATCH(request: Request) {
  const auth = await authorize(request, ["mvz.roles.write"]);
  if (!auth.ok) {
    return auth.response;
  }

  return apiError("FORBIDDEN", MVZ_ROLE_MANAGEMENT_DISABLED_MESSAGE, 403);
}

export async function DELETE(request: Request) {
  const auth = await authorize(request, ["mvz.roles.write"]);
  if (!auth.ok) {
    return auth.response;
  }

  return apiError("FORBIDDEN", MVZ_ROLE_MANAGEMENT_DISABLED_MESSAGE, 403);
}

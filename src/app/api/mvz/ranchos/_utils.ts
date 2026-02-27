import { apiError } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import {
  createSupabaseRlsServerClient,
  getSupabaseAdminClient,
} from "@/server/auth/supabase";
import type { PermissionKey } from "@/shared/lib/auth";
import type { AuthorizedContext } from "@/server/authz";

interface MvzRanchAccessOk {
  ok: true;
  context: AuthorizedContext;
  upp: {
    id: string;
    tenant_id: string;
    name: string;
  };
  mvzProfileId: string;
  supabase: ReturnType<typeof createSupabaseRlsServerClient>;
}

interface MvzRanchAccessFail {
  ok: false;
  response: Response;
}

export async function requireMvzRanchAccess(
  request: Request,
  uppId: string,
  permission: PermissionKey,
  resource: string
): Promise<MvzRanchAccessOk | MvzRanchAccessFail> {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.ranch.read", permission],
    requireAllPermissions: true,
    scope: { uppId },
    resource,
  });

  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }

  const mvzProfileId = await resolveMvzProfileId(auth.context.user);
  if (!mvzProfileId) {
    return {
      ok: false,
      response: apiError(
        "MVZ_PROFILE_NOT_FOUND",
        "No existe perfil MVZ activo para el usuario.",
        403
      ),
    };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const uppResult = await supabaseAdmin
    .from("upps")
    .select("id,tenant_id,name")
    .eq("id", uppId)
    .maybeSingle();

  if (uppResult.error || !uppResult.data) {
    return {
      ok: false,
      response: apiError("UPP_NOT_FOUND", "No existe UPP para el id enviado.", 404),
    };
  }

  return {
    ok: true,
    context: auth.context,
    upp: uppResult.data,
    mvzProfileId,
    supabase: createSupabaseRlsServerClient(auth.context.user.accessToken),
  };
}

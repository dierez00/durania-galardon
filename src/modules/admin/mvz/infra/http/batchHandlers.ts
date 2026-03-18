import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { ServerAdminMvzRepository } from "@/modules/admin/mvz/infra/supabase/ServerAdminMvzRepository";
import type { AdminMvzRoleKey } from "@/modules/admin/mvz/domain/repositories/adminMvzRepository";

interface MvzBatchRowBody {
  email?: string;
  fullName?: string;
  licenseNumber?: string;
}

interface MvzBatchBody {
  rows?: MvzBatchRowBody[];
  options?: {
    atomic?: boolean;
    roleKey?: AdminMvzRoleKey;
  };
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz.batch",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzBatchBody;
  try {
    body = (await request.json()) as MvzBatchBody;
  } catch (error_) {
    console.error("[mvz/batch] JSON parse error:", error_);
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const repository = new ServerAdminMvzRepository(auth.context.user.id);

  try {
    const result = await repository.createBatch({
      rows: (body.rows ?? []).map((row) => ({
        email: row.email ?? "",
        fullName: row.fullName ?? "",
        licenseNumber: row.licenseNumber ?? "",
      })),
      options: {
        atomic: true,
        roleKey: body.options?.roleKey ?? "mvz_government",
      },
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "admin.mvz.batch",
      payload: {
        count: result.count,
        roleKey: body.options?.roleKey ?? "mvz_government",
      },
    });

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiError(
      "ADMIN_MVZ_BATCH_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear el lote.",
      400
    );
  }
}

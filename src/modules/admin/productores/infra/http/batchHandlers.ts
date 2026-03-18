import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { ServerAdminProductoresRepository } from "@/modules/admin/productores/infra/supabase/ServerAdminProductoresRepository";

interface ProducerBatchRowBody {
  email?: string;
  fullName?: string;
  curp?: string;
}

interface ProducerBatchBody {
  rows?: ProducerBatchRowBody[];
  options?: {
    atomic?: boolean;
  };
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers.batch",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerBatchBody;
  try {
    body = (await request.json()) as ProducerBatchBody;
  } catch (error_) {
    console.error("[producers/batch] JSON parse error:", error_);
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const repository = new ServerAdminProductoresRepository(
    auth.context.user.tenantId,
    auth.context.user.id
  );

  try {
    const result = await repository.createBatch({
      rows: (body.rows ?? []).map((row) => ({
        email: row.email ?? "",
        fullName: row.fullName ?? "",
        curp: row.curp,
      })),
      options: {
        atomic: true,
      },
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "admin.producers.batch",
      payload: { count: result.count },
    });

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiError(
      "ADMIN_PRODUCERS_BATCH_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear el lote.",
      400
    );
  }
}

import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { ListProducerUpps } from "@/modules/producer/ranchos/application/use-cases/listProducerUpps";
import { ServerProducerUppsRepository } from "@/modules/producer/ranchos/infra/supabase/ServerProducerUppsRepository";
import {
  logProducerAccessServer,
  sampleProducerAccessIds,
  summarizeProducerAccessError,
} from "@/server/debug/producerAccess";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.upp.read"],
    resource: "producer.upp",
  });
  if (!auth.ok) {
    return auth.response;
  }

  logProducerAccessServer("producer/upp:get:start", {
    userId: auth.context.user.id,
    role: auth.context.user.role,
    tenantId: auth.context.user.tenantId,
    tenantSlug: auth.context.user.tenantSlug,
    panelType: auth.context.user.panelType,
  });

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  logProducerAccessServer("producer/upp:get:accessible-ids", {
    userId: auth.context.user.id,
    tenantId: auth.context.user.tenantId,
    accessibleUpps: sampleProducerAccessIds(accessibleUppIds),
  });
  if (accessibleUppIds.length === 0) {
    logProducerAccessServer("producer/upp:get:empty-access", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
    });
  }

  const repository = new ServerProducerUppsRepository(
    auth.context.user.tenantId,
    auth.context.user.accessToken,
    accessibleUppIds
  );
  const useCase = new ListProducerUpps(repository);

  try {
    const result = await useCase.execute({ search: "", status: "" });
    logProducerAccessServer("producer/upp:get:end", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
      upps: sampleProducerAccessIds(result.upps.map((upp) => upp.id)),
    });
    return apiSuccess(result);
  } catch (error) {
    logProducerAccessServer("producer/upp:get:error", {
      userId: auth.context.user.id,
      tenantId: auth.context.user.tenantId,
      error: summarizeProducerAccessError(error),
    });
    return apiError(
      "PRODUCER_UPP_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar ranchos.",
      500
    );
  }
}

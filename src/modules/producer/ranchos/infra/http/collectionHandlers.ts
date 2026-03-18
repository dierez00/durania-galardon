import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { ListProducerUpps } from "@/modules/producer/ranchos/application/use-cases/listProducerUpps";
import { ServerProducerUppsRepository } from "@/modules/producer/ranchos/infra/supabase/ServerProducerUppsRepository";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.upp.read"],
    resource: "producer.upp",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  const repository = new ServerProducerUppsRepository(
    auth.context.user.tenantId,
    auth.context.user.accessToken,
    accessibleUppIds
  );
  const useCase = new ListProducerUpps(repository);

  try {
    const result = await useCase.execute({ search: "", status: "" });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      "PRODUCER_UPP_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar ranchos.",
      500
    );
  }
}

import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { GetProducerUppDetail } from "@/modules/producer/ranchos/application/use-cases/getProducerUppDetail";
import { ServerProducerUppsRepository } from "@/modules/producer/ranchos/infra/supabase/ServerProducerUppsRepository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uppId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.upp.read"],
    resource: "producer.upp",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { uppId } = await params;
  const repository = new ServerProducerUppsRepository(
    auth.context.user.tenantId,
    auth.context.user.accessToken,
    await auth.context.getAccessibleUppIds()
  );
  const useCase = new GetProducerUppDetail(repository);

  try {
    const upp = await useCase.execute(uppId);
    if (!upp) {
      return apiError("UPP_NOT_FOUND", "Rancho no encontrado.", 404);
    }
    return apiSuccess({ upp });
  } catch (error) {
    return apiError(
      "UPP_NOT_FOUND",
      error instanceof Error ? error.message : "Rancho no encontrado.",
      404
    );
  }
}

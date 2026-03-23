import { CreateReemoMovement } from "../application/use-cases/createReemoMovement";
import { ConfirmMovementArrival } from "../application/use-cases/confirmMovementArrival";
import { ListMovements } from "../application/use-cases/listMovements";
import { ServerMovementRepository } from "./supabase/ServerMovementRepository";

export function createMovementContainer(params: { tenantId: string; accessToken: string }) {
  const repository = new ServerMovementRepository(params.tenantId, params.accessToken);

  return {
    listMovementsUseCase: new ListMovements(repository),
    createReemoMovementUseCase: new CreateReemoMovement(repository),
    confirmMovementArrivalUseCase: new ConfirmMovementArrival(repository),
  };
}

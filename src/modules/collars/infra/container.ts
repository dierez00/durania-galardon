import { ServerCollarRepository } from "./supabase/ServerCollarRepository";
import { ProvisionCollarToProducer } from "../application/use-cases/ProvisionCollarToProducer";
import { GetProducerCollarInventory } from "../application/use-cases/GetProducerCollarInventory";
import { GetAllCollarsByTenant } from "../application/use-cases/GetAllCollarsByTenant";
import { AssignCollarToAnimal } from "../application/use-cases/AssignCollarToAnimal";
import { UnassignCollarFromAnimal } from "../application/use-cases/UnassignCollarFromAnimal";
import { GetCollarDetail } from "../application/use-cases/GetCollarDetail";
import { ListCollarHistory } from "../application/use-cases/ListCollarHistory";

/**
 * Factory function to create all collar use cases with dependencies
 * Called once per request context (tenant + access token)
 */
export function createCollarUseCases(
  tenantId: string,
  accessToken: string,
  accessibleUppIds?: string[]
) {
  const repository = new ServerCollarRepository(tenantId, accessToken, accessibleUppIds);

  return {
    provisionCollar: new ProvisionCollarToProducer(repository),
    getInventory: new GetProducerCollarInventory(repository),
    getAllCollars: new GetAllCollarsByTenant(repository),
    assignCollar: new AssignCollarToAnimal(repository),
    unassignCollar: new UnassignCollarFromAnimal(repository),
    getDetail: new GetCollarDetail(repository),
    getHistory: new ListCollarHistory(repository),
  };
}

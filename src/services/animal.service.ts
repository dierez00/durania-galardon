import { getAnimalsByTenant } from "./db/animal.db.service";

export async function listAnimalsByTenant(tenantId: string) {
  const animals = await getAnimalsByTenant(tenantId);
  return animals;
}

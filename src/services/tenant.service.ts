import { getAllTenants, getTenantById } from "./db/tenant.db.service";

export async function listAllTenants() {
  return await getAllTenants();
}

export async function getTenantDetails(tenantId: string) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant no encontrado");
  }
  return tenant;
}

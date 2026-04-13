import { Request, Response, NextFunction } from "express";
import { listAllTenants, getTenantDetails } from "../services/tenant.service";
import { ensureString } from "../utils/validation";

export async function getAllTenantsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenants = await listAllTenants();

    res.json({
      count: tenants.length,
      items: tenants,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTenantByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = ensureString(req.params.tenantId, "tenantId");

    const tenant = await getTenantDetails(tenantId);

    res.json(tenant);
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from "express";
import { listAnimalsByTenant } from "../services/animal.service";
import { ensureString } from "../utils/validation";

export async function getTenantAnimalsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = ensureString(req.params.tenantId, "tenantId");

    const animals = await listAnimalsByTenant(tenantId);

    res.json({
      tenantId,
      count: animals.length,
      items: animals,
    });
  } catch (err) {
    next(err);
  }
}

import { Router } from "express";
import { getTenantAnimalsHandler } from "../controllers/animal.controller";
import { getAllTenantsHandler, getTenantByIdHandler } from "../controllers/tenant.controller";

const router = Router();

// Animales por tenant
router.get("/tenants/:tenantId/animals", getTenantAnimalsHandler);

// Tenants
router.get("/tenants", getAllTenantsHandler);
router.get("/tenants/:tenantId", getTenantByIdHandler);

export default router;

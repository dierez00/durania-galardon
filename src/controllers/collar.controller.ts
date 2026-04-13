import { Request, Response, NextFunction } from "express";
import {
  createCollar,
  assignCollarToAnimal,
  getCollarCurrentAssignment,
  unassignCollar,
  assignCollarTenant,
  unassignCollarTenant,
  listCollarsByTenant,
} from "../services/collar.service";
import { ensureString } from "../utils/validation";

function getQueryParamString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return undefined;
}

export async function createCollarHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body || {};
    const tenantIdFromQuery = getQueryParamString(req.query.tenantId);

    const collarId = ensureString(body.collarId ?? body.collar_id, "collarId");
    const tenantId = body.tenantId ?? body.tenant_id ?? tenantIdFromQuery;
    const firmwareVersion = body.firmwareVersion ?? body.firmware_version;
    const purchasedAt = body.purchasedAt ?? body.purchased_at;

    const collar = await createCollar({
      collarId,
      tenantId,
      firmwareVersion,
      purchasedAt,
    });

    res.status(201).json({ collar });
  } catch (err) {
    next(err);
  }
}

export async function assignCollar(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (UUID)");
    const body = req.body || {};
    const tenantIdFromQuery = getQueryParamString(req.query.tenantId);

    const animalId = ensureString(body.animalId ?? body.animal_id, "animalId");
    const tenantId = body.tenantId ?? body.tenant_id ?? tenantIdFromQuery;
    const linkedBy = body.linkedBy ?? body.linked_by;

    const result = await assignCollarToAnimal({
      collarUuid: collarId,
      animalId,
      tenantId,
      linkedBy,
    });

    res.json({
      collar: result.collar,
      animal: result.animal,
    });
  } catch (err) {
    next(err);
  }
}

export async function unassignCollarHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (UUID)");
    const body = req.body || {};
    const tenantIdFromQuery = getQueryParamString(req.query.tenantId);

    const tenantId = body.tenantId ?? body.tenant_id ?? tenantIdFromQuery;
    const unlinkedBy = body.unlinkedBy ?? body.unlinked_by;

    const result = await unassignCollar({
      collarUuid: collarId,
      tenantId,
      unlinkedBy,
    });

    res.json({
      collar: result.collar,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCollarAssignmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (UUID)");
    const tenantId = getQueryParamString(req.query.tenantId);

    const result = await getCollarCurrentAssignment({
      collarUuid: collarId,
      tenantId,
    });

    if (!result.collar) {
      return res.status(404).json({
        error: true,
        message: "Collar no encontrado",
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function assignCollarTenantHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (UUID)");
    const body = req.body || {};

    const tenantId = ensureString(body.tenantId ?? body.tenant_id, "tenantId");

    const collar = await assignCollarTenant({
      collarUuid: collarId,
      tenantId,
    });

    res.json({ collar });
  } catch (err) {
    next(err);
  }
}

export async function unassignCollarTenantHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (UUID)");

    const collar = await unassignCollarTenant({
      collarUuid: collarId,
    });

    res.json({ collar });
  } catch (err) {
    next(err);
  }
}

export async function listTenantCollarsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = ensureString(req.params.tenantId, "tenantId");

    const collars = await listCollarsByTenant({ tenantId });

    res.json({
      tenantId,
      count: collars.length,
      items: collars,
    });
  } catch (err) {
    next(err);
  }
}

export async function listCollarsByTenantQueryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = ensureString(getQueryParamString(req.query.tenantId), "tenantId");

    const collars = await listCollarsByTenant({ tenantId });

    res.json({
      tenantId,
      count: collars.length,
      items: collars,
    });
  } catch (err) {
    next(err);
  }
}

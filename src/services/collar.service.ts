import { Collar } from "../types/collar.types";
import { Animal } from "../types/animal.types";
import {
  insertCollar,
  getAnimalById,
  getCollarById,
  getCollarByCollarId,
  getCollarsByTenant,
  linkCollarToAnimalTx,
  unlinkCollarTx,
  updateCollarTenant,
} from "./db/collar.db.service";

export async function createCollar(params: {
  collarId: string;
  tenantId?: string;
  firmwareVersion?: string;
  purchasedAt?: string;
}): Promise<Collar> {
  const existing = await getCollarByCollarId(params.collarId, params.tenantId);
  if (existing) {
    throw new Error("Ya existe un collar con ese identificador");
  }

  const collar = await insertCollar({
    collarId: params.collarId,
    tenantId: params.tenantId ?? null,
    firmwareVersion: params.firmwareVersion ?? null,
    purchasedAt: params.purchasedAt ?? null,
  });

  return collar;
}

export async function assignCollarToAnimal(params: {
  collarUuid: string; // PK de collars.id
  animalId: string;
  tenantId?: string;
  linkedBy?: string;
}): Promise<{ collar: Collar; animal: Animal }> {
  const { collarUuid, animalId, tenantId, linkedBy } = params;

  const collar = await getCollarById(collarUuid, tenantId);
  if (!collar) {
    throw new Error("Collar no encontrado");
  }

  if (collar.animal_id) {
    throw new Error("El collar ya está asignado a un animal");
  }

  const animal = await getAnimalById(animalId, tenantId);
  if (!animal) {
    throw new Error("Animal no encontrado");
  }
  if (animal.status !== "active") {
    throw new Error("El animal no está en estado activo");
  }

  const effectiveTenantId = tenantId ?? collar.tenant_id ?? animal.tenant_id ?? null;
  if (!effectiveTenantId) {
    throw new Error("No se pudo resolver tenantId para registrar el historial de asignación");
  }

  if (collar.tenant_id && animal.tenant_id && collar.tenant_id !== animal.tenant_id) {
    throw new Error("El collar y el animal pertenecen a tenants distintos");
  }

  await linkCollarToAnimalTx({
    collarUuid: collar.id,
    animalId: animal.id,
    tenantId: effectiveTenantId,
    linkedBy,
  });

  const updatedCollar = await getCollarById(collarUuid, effectiveTenantId);

  return {
    collar: updatedCollar ?? collar,
    animal,
  };
}

export async function unassignCollar(params: {
  collarUuid: string;
  tenantId?: string;
  unlinkedBy?: string;
}): Promise<{ collar: Collar }> {
  const { collarUuid, tenantId, unlinkedBy } = params;

  const collar = await getCollarById(collarUuid, tenantId);
  if (!collar) {
    throw new Error("Collar no encontrado");
  }

  if (!collar.animal_id) {
    throw new Error("El collar no está asignado a ningún animal");
  }

  const effectiveTenantId = tenantId ?? collar.tenant_id ?? null;
  if (!effectiveTenantId) {
    throw new Error("No se pudo resolver tenantId para registrar el historial de desasignación");
  }

  await unlinkCollarTx({
    collarUuid: collar.id,
    tenantId: effectiveTenantId,
    unlinkedBy,
  });

  const updatedCollar = await getCollarById(collarUuid, effectiveTenantId);

  return {
    collar: updatedCollar ?? collar,
  };
}

export async function getCollarCurrentAssignment(params: {
  collarUuid: string;
  tenantId?: string;
}): Promise<{
  collar: Collar | null;
  animal: Animal | null;
}> {
  const { collarUuid, tenantId } = params;

  const collar = await getCollarById(collarUuid, tenantId);
  if (!collar) {
    return { collar: null, animal: null };
  }

  let animal: Animal | null = null;
  if (collar.animal_id) {
    animal = await getAnimalById(collar.animal_id, tenantId);
  }

  return { collar, animal };
}

export async function assignCollarTenant(params: {
  collarUuid: string;
  tenantId: string;
}): Promise<Collar> {
  const { collarUuid, tenantId } = params;

  const collar = await getCollarById(collarUuid);
  if (!collar) {
    throw new Error("Collar no encontrado");
  }

  const updated = await updateCollarTenant(collarUuid, tenantId);
  return updated ?? collar;
}

export async function unassignCollarTenant(params: {
  collarUuid: string;
}): Promise<Collar> {
  const { collarUuid } = params;

  const collar = await getCollarById(collarUuid);
  if (!collar) {
    throw new Error("Collar no encontrado");
  }

  const updated = await updateCollarTenant(collarUuid, null);
  return updated ?? collar;
}

export async function listCollarsByTenant(params: {
  tenantId: string;
}): Promise<Collar[]> {
  const { tenantId } = params;

  const collars = await getCollarsByTenant(tenantId, false);
  return collars;
}

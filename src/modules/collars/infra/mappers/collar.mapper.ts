import type { Collar } from "../../domain/entities/Collar";

type CollarRow = {
  id: string;
  tenant_id: string;
  collar_id: string;
  animal_id: string | null;
  status: Collar["status"];
  firmware_version: string | null;
  purchased_at: string | null;
  linked_at: string | null;
  unlinked_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Map Supabase/Prisma row to Domain Collar entity
 */
export function toDomainCollar(row: CollarRow): Collar {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    collar_id: row.collar_id,
    animal_id: row.animal_id || null,
    status: row.status,
    firmware_version: row.firmware_version || null,
    purchased_at: row.purchased_at || null,
    linked_at: row.linked_at || null,
    unlinked_at: row.unlinked_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Map Domain Collar entity to API response format
 */
export function toApiCollar(collar: Collar): Record<string, unknown> {
  return {
    id: collar.id,
    collar_id: collar.collar_id,
    status: collar.status,
    animal_id: collar.animal_id,
    firmware_version: collar.firmware_version,
    purchased_at: collar.purchased_at,
    linked_at: collar.linked_at,
    unlinked_at: collar.unlinked_at,
    created_at: collar.created_at,
    updated_at: collar.updated_at,
  };
}

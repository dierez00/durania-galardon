import type { Collar } from "@/modules/collars/domain/entities/Collar";
import type { CollarAnimalHistory } from "@/modules/collars/domain/entities/CollarAnimalHistory";

/**
 * Map Domain Collar to API response
 */
export function toApiCollar(collar: Collar) {
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

/**
 * Map Domain CollarAnimalHistory to API response
 */
export function toApiCollarHistory(history: CollarAnimalHistory) {
  return {
    id: history.id,
    collar_id_fk: history.collar_id_fk,
    animal_id: history.animal_id,
    linked_by: history.linked_by,
    unlinked_by: history.unlinked_by,
    linked_at: history.linked_at,
    unlinked_at: history.unlinked_at,
    notes: history.notes,
  };
}

/**
 * Format list of collars for response
 */
export function toApiCollarList(collars: Collar[]) {
  return collars.map(toApiCollar);
}

/**
 * Format history entries for response
 */
export function toApiHistoryList(entries: CollarAnimalHistory[]) {
  return entries.map(toApiCollarHistory);
}

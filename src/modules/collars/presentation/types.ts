/**
 * Tipos genéricos compartidos para componentes y hooks de collares
 * (capability standalone, reutilizable por admin, producer, mvz)
 */

export type CollarStatus = "inactive" | "active" | "linked" | "unlinked" | "suspended" | "retired";

export interface CollarListItem {
  id: string;
  collar_id: string;
  producer_id: string;
  producer_name: string;
  firmware_version: string;
  status: CollarStatus;
  linked_at: string | null;
  purchased_at: string | null;
  created_at: string;
}

export interface CollarDetail extends CollarListItem {
  animal_id: string | null;
  animal_name: string | null;
  unlinked_at: string | null;
  notes: string | null;
}

export interface CollarLinkHistory {
  id: string;
  collar_id: string;
  animal_id: string;
  animal_name: string;
  linked_by: string;
  linked_by_name?: string;
  linked_at: string;
  unlinked_by: string | null;
  unlinked_by_name?: string | null;
  unlinked_at: string | null;
  notes: string | null;
}

export interface ProducerCollarItem {
  id: string;
  collar_id: string;
  firmware_version: string;
  status: CollarStatus;
  linked_at: string | null;
  animal_name: string | null;
}

export interface ProducerListItem {
  id: string;
  full_name: string;
  curp?: string;
}

export interface AnimalInfo {
  id: string;
  name: string;
  breed?: string;
}

export interface ProducerInfo {
  id: string;
  fullName: string;
  email?: string;
  curp?: string;
}

export interface CollarsFiltersState {
  search: string;
  status: string;
  productor_id: string;
  firmware: string;
  dateFrom: string;
  dateTo: string;
}

export type CollarSortField = "collar_id" | "linked_at" | "purchased_at" | "status" | "firmware";
export type SortDir = "asc" | "desc";

export interface CollarSortState {
  field: CollarSortField;
  dir: SortDir;
}

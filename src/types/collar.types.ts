export type CollarStatus =
  | "inactive"
  | "active"
  | "linked"
  | "unlinked"
  | "suspended"
  | "retired";

export interface Collar {
  id: string;
  collar_id: string; // identificador físico/lógico del collar
  tenant_id?: string | null;
  animal_id?: string | null;
  status: CollarStatus;
  firmware_version?: string | null;
  linked_at?: string | null;
  purchased_at?: string | null;
}

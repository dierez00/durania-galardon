export type AnimalStatus =
  | "active"
  | "blocked"
  | "in_transit"
  | "inactive";

export interface Animal {
  id: string;
  tenant_id?: string | null;
  upp_id?: string | null;
  siniiga_tag?: string | null;
  sex?: "M" | "F" | null;
  birth_date?: string | null;
  status: AnimalStatus;
}

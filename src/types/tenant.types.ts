export type TenantType = "government" | "producer" | "mvz";
export type TenantStatus = "active" | "inactive" | "blocked";

export interface Tenant {
  id: string;
  type: TenantType;
  slug: string;
  name: string;
  status: TenantStatus;
  created_by_user_id?: string | null;
  created_at?: string;
}

export type TenantSource = "subdomain" | "header" | "local";

export interface TenantContext {
  tenantSlug: string;
  tenantId?: string;
  source: TenantSource;
}

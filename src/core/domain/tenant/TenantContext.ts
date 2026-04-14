export type TenantSource = "subdomain" | "header" | "local" | "public-site";

export interface TenantContext {
  tenantSlug: string;
  tenantId?: string;
  source: TenantSource;
}

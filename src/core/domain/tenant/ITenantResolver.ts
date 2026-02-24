import type { TenantContext } from "./TenantContext";

export interface ITenantResolver {
  resolve(request: Request): TenantContext | null;
}

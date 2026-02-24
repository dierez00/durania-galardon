import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/server/tenants/resolveTenant";

export const RESOLVED_TENANT_HEADER = "x-tenant-slug-resolved";
export const TENANT_SOURCE_HEADER = "x-tenant-source";

export function applyTenantContext(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  const tenant = resolveTenant(request);

  if (tenant) {
    requestHeaders.set(RESOLVED_TENANT_HEADER, tenant.tenantSlug);
    requestHeaders.set(TENANT_SOURCE_HEADER, tenant.source);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (tenant) {
    response.headers.set(RESOLVED_TENANT_HEADER, tenant.tenantSlug);
    response.headers.set(TENANT_SOURCE_HEADER, tenant.source);
  }

  return response;
}

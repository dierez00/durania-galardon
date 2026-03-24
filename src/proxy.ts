import type { NextRequest } from "next/server";
import { applyTenantContext } from "@/server/middleware/tenant-context";

export function proxy(request: NextRequest) {
  return applyTenantContext(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

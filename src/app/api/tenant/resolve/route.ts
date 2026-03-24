import { apiSuccess } from "@/shared/lib/api-response";
import { resolveTenant } from "@/server/tenants/resolveTenant";

export async function GET(request: Request) {
  const tenant = resolveTenant(request);
  return apiSuccess({ tenant });
}

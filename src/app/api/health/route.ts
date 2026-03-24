import { apiSuccess } from "@/shared/lib/api-response";

export async function GET() {
  return apiSuccess({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

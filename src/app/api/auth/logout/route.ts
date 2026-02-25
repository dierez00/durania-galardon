import { apiSuccess } from "@/shared/lib/api-response";

export async function POST() {
  return apiSuccess({
    status: "signed_out",
  });
}

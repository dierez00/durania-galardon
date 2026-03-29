import { apiFetchAdminProducerOptions } from "@/modules/admin/productores/infra/api/adminProductoresApi";
import { updateProductorStatusUseCase } from "@/modules/admin/productores/infra/container";

export async function listProducerOptions() {
  return apiFetchAdminProducerOptions(1000);
}

export async function toggleProducerStatus(
  producerId: string,
  currentStatus: "active" | "inactive"
): Promise<void> {
  const nextStatus = currentStatus === "active" ? "inactive" : "active";
  await updateProductorStatusUseCase.execute(producerId, nextStatus);
}

import type { ICollarRepository } from "@/modules/collars/domain/repositories/CollarRepository";
import type { AdminProvisionCollarDTO } from "../dto/index";

/**
 * Use Case: Admin provisions (registers) a new collar
 */
export class ProvisionCollarToProducer {
  constructor(private repository: ICollarRepository) {}

  async execute(dto: AdminProvisionCollarDTO): Promise<{ id: string }> {
    // Check if collar_id already exists
    const existing = await this.repository.findByCollarId(dto.collar_id);
    if (existing) {
      throw new Error(`Collar with ID '${dto.collar_id}' already exists`);
    }

    // Create new collar in "inactive" status
    const collar = await this.repository.create({
      collar_id: dto.collar_id,
      tenant_id: "", // Will be set by repository context
      animal_id: null,
      status: "inactive",
      firmware_version: dto.firmware_version || null,
      purchased_at: dto.purchased_at || null,
      linked_at: null,
      unlinked_at: null,
    });

    return { id: collar.id };
  }
}

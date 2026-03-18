import type { AdminExportacionDetallada } from "../entities/AdminExportacionDetailEntity";
import type {
  AdminExportacionAnimal,
  AdminExportacionAnimalDetail,
} from "../entities/AdminExportacionAnimalEntity";
import type { AdminExportacionStatus } from "../entities/AdminExportacionEntity";

export interface UpdateExportStatusInput {
  id: string;
  status: AdminExportacionStatus;
  blockedReason?: string;
  complianceRule60?: boolean;
  tbBrValidated?: boolean;
  blueTagAssigned?: boolean;
}

export interface IAdminExportacionDetailRepository {
  getById(id: string): Promise<AdminExportacionDetallada | null>;
  getAnimales(exportId: string): Promise<AdminExportacionAnimal[]>;
  getAnimalById(
    exportId: string,
    animalId: string
  ): Promise<AdminExportacionAnimalDetail | null>;
  updateStatus(input: UpdateExportStatusInput): Promise<void>;
}

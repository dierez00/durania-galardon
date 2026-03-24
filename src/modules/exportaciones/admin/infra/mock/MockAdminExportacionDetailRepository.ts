import type { IAdminExportacionDetailRepository, UpdateExportStatusInput } from "../../domain/repositories/IAdminExportacionDetailRepository";
import type { AdminExportacionDetallada } from "../../domain/entities/AdminExportacionDetailEntity";
import type {
  AdminExportacionAnimal,
  AdminExportacionAnimalDetail,
} from "../../domain/entities/AdminExportacionAnimalEntity";
import { adminExportacionesMock } from "./adminExportaciones.mock";

const MOCK_ANIMALS: AdminExportacionAnimal[] = [
  {
    id: "ani-1",
    siniigaTag: "MX-001-0001",
    sex: "M",
    birthDate: "2022-05-10",
    status: "active",
    sanitaryAlert: "ok",
    tbLastDate: "2025-08-10",
    tbResult: "negative",
    tbValidUntil: "2026-08-10",
    tbStatus: "ok",
    brLastDate: "2025-08-10",
    brResult: "negative",
    brValidUntil: "2026-08-10",
    brStatus: "ok",
  },
  {
    id: "ani-2",
    siniigaTag: "MX-001-0002",
    sex: "F",
    birthDate: "2021-03-22",
    status: "active",
    sanitaryAlert: "por_vencer",
    tbLastDate: "2025-03-22",
    tbResult: "negative",
    tbValidUntil: "2026-03-22",
    tbStatus: "por_vencer",
    brLastDate: "2025-03-22",
    brResult: "negative",
    brValidUntil: "2026-03-22",
    brStatus: "por_vencer",
  },
  {
    id: "ani-3",
    siniigaTag: "MX-001-0003",
    sex: "M",
    birthDate: "2023-01-15",
    status: "active",
    sanitaryAlert: "sin_pruebas",
    tbLastDate: null,
    tbResult: null,
    tbValidUntil: null,
    tbStatus: "sin_pruebas",
    brLastDate: null,
    brResult: null,
    brValidUntil: null,
    brStatus: "sin_pruebas",
  },
];

export class MockAdminExportacionDetailRepository
  implements IAdminExportacionDetailRepository
{
  async getById(id: string): Promise<AdminExportacionDetallada | null> {
    const e = adminExportacionesMock.find((x) => x.id === id);
    if (!e) return null;
    const animalIds = (e.metrics_json?.animal_ids as string[] | undefined) ?? [];
    return {
      id: e.id,
      producerId: e.producer_id,
      uppId: e.upp_id,
      producerName: e.producer_name,
      uppName: e.upp_name,
      uppCode: e.upp_id ? `UPP-${e.upp_id.toUpperCase()}` : null,
      status: e.status,
      complianceRule60: e.compliance_60_rule,
      tbBrValidated: e.tb_br_validated,
      blueTagAssigned: e.blue_tag_assigned,
      monthlyBucket: e.monthly_bucket,
      metricsJson: e.metrics_json,
      blockedReason: e.blocked_reason,
      validatedByMvzUserId: null,
      approvedByAdminUserId: null,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      totalAnimals: animalIds.length,
    };
  }

  async getAnimales(exportId: string): Promise<AdminExportacionAnimal[]> {
    const e = adminExportacionesMock.find((x) => x.id === exportId);
    if (!e) return [];
    const animalIds = (e.metrics_json?.animal_ids as string[] | undefined) ?? [];
    return MOCK_ANIMALS.filter((a) => animalIds.includes(a.id));
  }

  async getAnimalById(
    exportId: string,
    animalId: string
  ): Promise<AdminExportacionAnimalDetail | null> {
    const animals = await this.getAnimales(exportId);
    const base = animals.find((a) => a.id === animalId);
    if (!base) return null;
    const e = adminExportacionesMock.find((x) => x.id === exportId);
    return {
      ...base,
      uppId: e?.upp_id ?? "",
      uppName: e?.upp_name ?? null,
      motherAnimalId: null,
      tests: [
        {
          id: `test-tb-${animalId}`,
          testTypeKey: "tb" as const,
          sampleDate: base.tbLastDate ?? "2025-08-10",
          result: base.tbResult ?? "negative",
          validUntil: base.tbValidUntil,
          mvzFullName: "Dr. Carlos Mendoza",
        },
        {
          id: `test-br-${animalId}`,
          testTypeKey: "br" as const,
          sampleDate: base.brLastDate ?? "2025-08-10",
          result: base.brResult ?? "negative",
          validUntil: base.brValidUntil,
          mvzFullName: "Dr. Carlos Mendoza",
        },
      ].filter((t) => t.sampleDate !== null),
    };
  }

  async updateStatus(input: UpdateExportStatusInput): Promise<void> {
    const idx = adminExportacionesMock.findIndex((x) => x.id === input.id);
    if (idx >= 0) {
      adminExportacionesMock[idx].status = input.status;
      if (input.blockedReason !== undefined) {
        adminExportacionesMock[idx].blocked_reason = input.blockedReason ?? null;
      }
    }
  }
}

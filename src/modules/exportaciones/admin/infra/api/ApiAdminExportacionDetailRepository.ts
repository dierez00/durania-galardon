import type { IAdminExportacionDetailRepository, UpdateExportStatusInput } from "../../domain/repositories/IAdminExportacionDetailRepository";
import type { AdminExportacionDetallada } from "../../domain/entities/AdminExportacionDetailEntity";
import type {
  AdminExportacionAnimal,
  AdminExportacionAnimalDetail,
} from "../../domain/entities/AdminExportacionAnimalEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE = "/api/admin/exports";

function authHeaders(token: string | null): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

export class ApiAdminExportacionDetailRepository
  implements IAdminExportacionDetailRepository
{
  async getById(id: string): Promise<AdminExportacionDetallada | null> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, { headers: authHeaders(token) });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { exportacion: AdminExportacionDetallada };
    };
    return json.data?.exportacion ?? null;
  }

  async getAnimales(exportId: string): Promise<AdminExportacionAnimal[]> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${exportId}/animals`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { animals: AdminExportacionAnimal[] };
    };
    return json.data?.animals ?? [];
  }

  async getAnimalById(
    exportId: string,
    animalId: string
  ): Promise<AdminExportacionAnimalDetail | null> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${exportId}/animals/${animalId}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { animal: AdminExportacionAnimalDetail };
    };
    return json.data?.animal ?? null;
  }

  async updateStatus(input: UpdateExportStatusInput): Promise<void> {
    const token = await getAccessToken();
    await fetch(`${BASE}/${input.id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({
        status: input.status,
        blockedReason: input.blockedReason,
        complianceRule60: input.complianceRule60,
        tbBrValidated: input.tbBrValidated,
        blueTagAssigned: input.blueTagAssigned,
      }),
    });
  }
}

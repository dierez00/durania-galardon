import type {
  AdminMvzDetallado,
  AdminMvzUpp,
  AdminMvzAvailableUpp,
  AdminMvzTest,
  AdminMvzVisitsPaginated,
} from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";
import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE = "/api/admin/mvz";

function authHeaders(token: string | null): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

export class ApiAdminMvzDetailRepository implements IAdminMvzDetailRepository {
  async getById(id: string): Promise<AdminMvzDetallado | null> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { mvz: AdminMvzDetallado };
    };
    return json.data?.mvz ?? null;
  }

  async getUpps(id: string): Promise<AdminMvzUpp[]> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}/upps`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { upps: AdminMvzUpp[] };
    };
    return json.data?.upps ?? [];
  }

  async getAvailableUpps(mvzId: string): Promise<AdminMvzAvailableUpp[]> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${mvzId}/upps?mode=available`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { upps: AdminMvzAvailableUpp[] };
    };
    return json.data?.upps ?? [];
  }

  async assignUpp(mvzId: string, uppId: string): Promise<void> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${mvzId}/upps`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ uppId }),
    });
    if (!resp.ok) {
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message ?? "Error al asignar el rancho.");
    }
  }

  async unassignUpp(mvzId: string, uppId: string): Promise<void> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${mvzId}/upps/${uppId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!resp.ok) {
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message ?? "Error al desasignar el rancho.");
    }
  }

  async getTests(id: string): Promise<AdminMvzTest[]> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}/tests`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { tests: AdminMvzTest[] };
    };
    return json.data?.tests ?? [];
  }

  async getVisits(id: string, page: number): Promise<AdminMvzVisitsPaginated> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}/visits?page=${page}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return { visits: [], total: 0, page, limit: 20 };
    const json = (await resp.json()) as {
      ok: boolean;
      data?: AdminMvzVisitsPaginated;
    };
    return json.data ?? { visits: [], total: 0, page, limit: 20 };
  }

  async updateStatus(id: string, status: "active" | "inactive"): Promise<void> {
    const token = await getAccessToken();
    await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    });
  }

  async updateProfile(
    id: string,
    payload: { fullName?: string; licenseNumber?: string }
  ): Promise<void> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message ?? "Error al actualizar el perfil del MVZ.");
    }
  }

  async updateEmail(id: string, email: string): Promise<void> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ email }),
    });
    if (!resp.ok) {
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message ?? "Error al actualizar el correo electrónico.");
    }
  }

  async deleteMvz(id: string): Promise<void> {
    const token = await getAccessToken();
    await fetch(`${BASE}/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
  }
}

import type {
  AdminProductorDetallado,
  AdminProductorDocument,
  AdminProductorUpp,
  AdminProductorVisitsPaginated,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE = "/api/admin/producers";

function authHeaders(token: string | null): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

export class ApiAdminProductorDetailRepository
  implements IAdminProductorDetailRepository
{
  async getById(id: string): Promise<AdminProductorDetallado | null> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { producer: AdminProductorDetallado };
    };
    return json.data?.producer ?? null;
  }

  async getUpps(id: string): Promise<AdminProductorUpp[]> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}/upps`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { upps: AdminProductorUpp[] };
    };
    return json.data?.upps ?? [];
  }

  async getDocuments(id: string): Promise<AdminProductorDocument[]> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}/documents`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { documents: AdminProductorDocument[] };
    };
    return json.data?.documents ?? [];
  }

  async getVisits(
    id: string,
    page: number
  ): Promise<AdminProductorVisitsPaginated> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}/visits?page=${page}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return { visits: [], total: 0, page, limit: 20 };
    const json = (await resp.json()) as {
      ok: boolean;
      data?: AdminProductorVisitsPaginated;
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
    payload: { fullName?: string; curp?: string | null }
  ): Promise<void> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message ?? "Error al actualizar el perfil del productor.");
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

  async deleteProductor(id: string): Promise<void> {
    const token = await getAccessToken();
    await fetch(`${BASE}/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
  }
}

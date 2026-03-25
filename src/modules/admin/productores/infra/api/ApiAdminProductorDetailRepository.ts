import type {
  AdminDocumentSourceType,
  AdminProductorDetallado,
  AdminProductorDocument,
  AdminProductorDocumentDetail,
  AdminProductorUpp,
  AdminProductorVisitsPaginated,
  ReviewAdminProductorDocumentInput,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import { getAccessToken } from "@/shared/lib/auth-session";

const BASE = "/api/admin/producers";

type ApiFailure = {
  ok: false;
  error?: { code?: string; message?: string };
};

function getErrorMessage(json: unknown, fallback: string): string {
  if (typeof json !== "object" || json === null) {
    return fallback;
  }

  const body = json as ApiFailure;
  if (body.error?.message) {
    return body.error.message;
  }
  return fallback;
}

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

  async getDocumentDetail(
    producerId: string,
    sourceType: AdminDocumentSourceType,
    documentId: string
  ): Promise<AdminProductorDocumentDetail | null> {
    const token = await getAccessToken();
    const query = new URLSearchParams({
      view: "detail",
      sourceType,
      documentId,
    });
    const resp = await fetch(`${BASE}/${producerId}/documents?${query.toString()}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { document: AdminProductorDocumentDetail };
    };
    return json.data?.document ?? null;
  }

  async getDocumentSignedUrl(
    producerId: string,
    sourceType: AdminDocumentSourceType,
    documentId: string
  ): Promise<string | null> {
    const token = await getAccessToken();
    const query = new URLSearchParams({
      view: "file",
      sourceType,
      documentId,
    });
    const resp = await fetch(`${BASE}/${producerId}/documents?${query.toString()}`, {
      headers: authHeaders(token),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      ok: boolean;
      data?: { url: string };
    };
    return json.data?.url ?? null;
  }

  async reviewDocument(producerId: string, input: ReviewAdminProductorDocumentInput): Promise<void> {
    const token = await getAccessToken();
    const resp = await fetch(`${BASE}/${producerId}/documents`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    });

    if (!resp.ok) {
      const json = await resp.json().catch(() => ({}));
      throw new Error(getErrorMessage(json, "Error al revisar el documento."));
    }
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
      const json = await resp.json().catch(() => ({}));
      throw new Error(getErrorMessage(json, "Error al actualizar el perfil del productor."));
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
      const json = await resp.json().catch(() => ({}));
      throw new Error(getErrorMessage(json, "Error al actualizar el correo electrónico."));
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

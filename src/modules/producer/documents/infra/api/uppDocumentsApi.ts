import { getAccessToken } from "@/shared/lib/auth-session";
import type { IUppDocumentsRepository } from "../../domain/repositories/uppDocumentsRepository";
import type { DocumentStatus, UppDocument } from "../../domain/entities/UppDocumentEntity";
import { calculateFileHash } from "../utils/fileHashCalculator";

interface UppDocumentDTO {
  id: string;
  tenant_id: string;
  upp_id: string;
  document_type: string;
  file_storage_key: string;
  file_hash: string;
  status: string;
  comments?: string | null;
  is_current: boolean;
  issued_at?: string;
  expiry_date?: string;
  uploaded_at: string;
}

export class UppDocumentsApiRepository implements IUppDocumentsRepository {
  private readonly BASE_URL = "/api/producer/upp-documents";

  async list(uppId?: string): Promise<UppDocument[]> {
    const token = await getAccessToken();
    if (!token) throw new Error("No existe sesiÃ³n activa.");

    const url = uppId ? `${this.BASE_URL}?uppId=${encodeURIComponent(uppId)}` : this.BASE_URL;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error?.message ?? "Error al cargar documentos de UPP.");
    }

    return (body.data.documents ?? []).map(this.mapToEntity);
  }

  async upload(
    file: File,
    uppId: string,
    documentType: string,
    expiryDate?: string
  ): Promise<UppDocument> {
    const token = await getAccessToken();
    if (!token) throw new Error("No existe sesiÃ³n activa.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uppId", uppId);
    formData.append("documentType", documentType);
    formData.append("fileHash", await calculateFileHash(file));
    if (expiryDate) formData.append("expiryDate", expiryDate);

    const response = await fetch(this.BASE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error?.message ?? "Error al subir documento de UPP.");
    }

    return this.mapToEntity(body.data.document);
  }

  async updateStatus(documentId: string, status: string, comments?: string | null): Promise<void> {
    const token = await getAccessToken();
    if (!token) throw new Error("No existe sesiÃ³n activa.");

    const response = await fetch(`${this.BASE_URL}/${documentId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, comments }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error?.message ?? "Error al actualizar documento.");
    }
  }

  async delete(documentId: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) throw new Error("No existe sesiÃ³n activa.");

    const response = await fetch(`${this.BASE_URL}/${documentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error?.message ?? "Error al eliminar documento de UPP.");
    }
  }

  private mapToEntity(raw: UppDocumentDTO): UppDocument {
    return {
      id: raw.id,
      tenantId: raw.tenant_id,
      uppId: raw.upp_id,
      documentType: raw.document_type,
      fileStorageKey: raw.file_storage_key,
      fileHash: raw.file_hash,
      status: raw.status as DocumentStatus,
      comments: raw.comments ?? null,
      isCurrent: raw.is_current,
      issuedAt: raw.issued_at ?? null,
      expiryDate: raw.expiry_date ?? null,
      uploadedAt: raw.uploaded_at,
    };
  }
}

import { getAccessToken } from "@/shared/lib/auth-session";
import type { IProducerDocumentsRepository } from "../../domain/repositories/producerDocumentsRepository";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import type { DocumentStatus } from "../../domain/entities/ProducerDocumentEntity";

// DTO recibido del backend para mapToEntity
interface ProducerDocumentDTO {
  id: string;
  tenant_id: string;
  producer_id: string;
  document_type_id: string;
  document_type?: {
    name?: string;
    key?: string;
  };
  file_storage_key: string;
  file_hash: string;
  status: string;
  is_current: boolean;
  expiry_date?: string;
  uploaded_at: string;
  ocr_confidence?: number;
}
import { calculateFileHash } from "../utils/fileHashCalculator";

export class ProducerDocumentsApiRepository implements IProducerDocumentsRepository {
  private readonly BASE_URL = "/api/producer/documents";

  async list(): Promise<ProducerDocument[]> {
    const token = await getAccessToken();
    if (!token) throw new Error("No existe sesión activa.");

    const response = await fetch(this.BASE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error?.message ?? "Error al cargar documentos.");
    }

    return (body.data.documents ?? []).map(this.mapToEntity);
  }

  async upload(
    file: File,
    documentTypeKey: string,
    expiryDate?: string
  ): Promise<ProducerDocument> {
    const token = await getAccessToken();
    if (!token) throw new Error("No existe sesión activa.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentTypeKey", documentTypeKey);
    formData.append("fileHash", await calculateFileHash(file));
    if (expiryDate) formData.append("expiryDate", expiryDate);

    const response = await fetch(this.BASE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error?.message ?? "Error al subir documento.");
    }

    return this.mapToEntity(body.data.document);
  }

  async updateStatus(documentId: string, status: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) throw new Error("No existe sesión activa.");

    const response = await fetch(`${this.BASE_URL}/${documentId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error?.message ?? "Error al actualizar documento.");
    }
  }

  private mapToEntity(raw: ProducerDocumentDTO): ProducerDocument {
    return {
      id: raw.id,
      tenantId: raw.tenant_id,
      producerId: raw.producer_id,
      documentTypeId: raw.document_type_id,
      documentTypeName: raw.document_type?.name ?? "",
      documentTypeKey: raw.document_type?.key ?? "",
      fileStorageKey: raw.file_storage_key,
      fileHash: raw.file_hash,
      status: raw.status as DocumentStatus,
      isCurrent: raw.is_current,
      expiryDate: raw.expiry_date ?? null,
      uploadedAt: raw.uploaded_at,
      ocrConfidence: raw.ocr_confidence ?? null,
    };
  }
}

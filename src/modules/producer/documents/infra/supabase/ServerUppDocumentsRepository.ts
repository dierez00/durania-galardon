import type { IUppDocumentsRepository } from "@/modules/producer/documents/domain/repositories/uppDocumentsRepository";
import type { UppDocument } from "@/modules/producer/documents/domain/entities/UppDocumentEntity";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import {
  calculateFileHash,
  DOCUMENTS_BUCKET,
  ensureBucketExists,
  uploadFileToSupabase,
} from "@/modules/producer/documents/infra/supabase/shared";

type UppDocumentRow = {
  id: string;
  tenant_id: string;
  upp_id: string;
  document_type: string;
  file_storage_key: string;
  file_hash: string;
  status: string;
  comments: string | null;
  is_current: boolean;
  issued_at: string | null;
  expiry_date: string | null;
  uploaded_at: string;
  full_text?: string | null;
  ocr_text?: string | null;
  ocr_fields?: Record<string, unknown> | null;
  ocr_metadata?: Record<string, unknown> | null;
};

function mapUppDocument(row: UppDocumentRow): UppDocument {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    uppId: row.upp_id,
    documentType: row.document_type,
    fileStorageKey: row.file_storage_key,
    fileHash: row.file_hash,
    status: row.status as UppDocument["status"],
    comments: row.comments,
    isCurrent: row.is_current,
    issuedAt: row.issued_at,
    expiryDate: row.expiry_date,
    uploadedAt: row.uploaded_at,
    fullText: row.full_text ?? null,
    ocrText: row.ocr_text ?? null,
    ocrFields: row.ocr_fields ?? null,
    ocrMetadata: row.ocr_metadata ?? null,
  };
}

export class ServerUppDocumentsRepository implements IUppDocumentsRepository {
  constructor(
    private readonly tenantId: string,
    private readonly userId: string,
    private readonly accessibleUppIds: string[]
  ) {}

  async list(): Promise<UppDocument[]> {
    if (this.accessibleUppIds.length === 0) {
      return [];
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const result = await supabaseAdmin
      .from("upp_documents")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .in("upp_id", this.accessibleUppIds)
      .order("uploaded_at", { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []).map((row) => mapUppDocument(row as UppDocumentRow));
  }

  async upload(file: File, uppId: string, documentType: string, expiryDate?: string, bovinoId?: string): Promise<UppDocument> {
    if (!this.accessibleUppIds.includes(uppId)) {
      throw new Error("No tiene acceso a la UPP solicitada.");
    }

    await ensureBucketExists(DOCUMENTS_BUCKET);

    const supabaseAdmin = getSupabaseAdminClient();
    
    // Obtener el producer_id del upp
    const uppResult = await supabaseAdmin
      .from("upps")
      .select("producer_id")
      .eq("id", uppId)
      .single();

    if (uppResult.error || !uppResult.data) {
      throw new Error("No fue posible obtener información del rancho (UPP).");
    }

    const producerId = uppResult.data.producer_id;

    if (bovinoId) {
      const animalResult = await supabaseAdmin
        .from("animals")
        .select("id")
        .eq("tenant_id", this.tenantId)
        .eq("upp_id", uppId)
        .eq("id", bovinoId)
        .maybeSingle();

      if (animalResult.error || !animalResult.data) {
        throw new Error("El bovino seleccionado no pertenece a la UPP indicada.");
      }
    }

    const calculatedHash = await calculateFileHash(file);
    const fileStorageKey = bovinoId
      ? `${this.tenantId}/${producerId}/upp/${uppId}/${bovinoId}/${documentType}/${Date.now()}_${file.name}`
      : `${this.tenantId}/${producerId}/upp/${uppId}/${documentType}/${Date.now()}_${file.name}`;

    await uploadFileToSupabase(file, fileStorageKey);
    await supabaseAdmin
      .from("upp_documents")
      .update({ is_current: false })
      .eq("tenant_id", this.tenantId)
      .eq("upp_id", uppId)
      .eq("document_type", documentType)
      .eq("is_current", true);

    const insertResult = await supabaseAdmin
      .from("upp_documents")
      .insert({
        tenant_id: this.tenantId,
        upp_id: uppId,
        document_type: documentType,
        file_storage_key: fileStorageKey,
        file_hash: calculatedHash,
        status: "pending",
        comments: null,
        is_current: true,
        expiry_date: expiryDate || null,
        uploaded_by_user_id: this.userId,
      })
      .select("*")
      .single();

    if (insertResult.error || !insertResult.data) {
      throw new Error(insertResult.error?.message ?? "No fue posible registrar documento.");
    }

    return mapUppDocument(insertResult.data as UppDocumentRow);
  }

  async updateStatus(documentId: string, status: string, comments?: string | null): Promise<void> {
    const supabaseAdmin = getSupabaseAdminClient();
    const payload: { status: string; comments?: string | null } = { status };
    if (comments !== undefined) {
      payload.comments = comments;
    }

    const result = await supabaseAdmin
      .from("upp_documents")
      .update(payload)
      .eq("tenant_id", this.tenantId)
      .eq("id", documentId);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async delete(documentId: string): Promise<void> {
    const supabaseAdmin = getSupabaseAdminClient();
    const docResult = await supabaseAdmin
      .from("upp_documents")
      .select("file_storage_key, upp_id")
      .eq("tenant_id", this.tenantId)
      .eq("id", documentId)
      .maybeSingle();

    if (docResult.error || !docResult.data) {
      throw new Error("Documento no encontrado.");
    }

    // Obtener el producer_id del upp para validar acceso
    const uppResult = await supabaseAdmin
      .from("upps")
      .select("producer_id")
      .eq("id", docResult.data.upp_id)
      .single();

    if (uppResult.error || !uppResult.data) {
      throw new Error("No fue posible validar el acceso al rancho.");
    }

    await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([docResult.data.file_storage_key]);
    const deleteResult = await supabaseAdmin.from("upp_documents").delete().eq("id", documentId);
    if (deleteResult.error) {
      throw new Error(deleteResult.error.message);
    }
  }
}

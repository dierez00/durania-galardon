import type { ProducerDocument } from "@/modules/producer/documents/domain/entities/ProducerDocumentEntity";
import type { IProducerDocumentsRepository } from "@/modules/producer/documents/domain/repositories/producerDocumentsRepository";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import {
  calculateFileHash,
  DOCUMENTS_BUCKET,
  ensureBucketExists,
  findProducerIdForUserOrTenant,
  PERSONAL_DOCUMENT_TYPE_META,
  uploadFileToSupabase,
} from "@/modules/producer/documents/infra/supabase/shared";

type ProducerDocumentRow = {
  id: string;
  tenant_id: string;
  producer_id: string;
  document_type_id: string;
  document_type?: { key?: string; name?: string } | null;
  file_storage_key: string;
  file_hash: string;
  status: string;
  is_current: boolean;
  expiry_date: string | null;
  uploaded_at: string;
  ocr_confidence?: number | null;
};

function mapProducerDocument(row: ProducerDocumentRow): ProducerDocument {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    producerId: row.producer_id,
    documentTypeId: row.document_type_id,
    documentTypeKey: row.document_type?.key ?? "",
    documentTypeName: row.document_type?.name ?? "",
    fileStorageKey: row.file_storage_key,
    fileHash: row.file_hash,
    status: row.status as ProducerDocument["status"],
    isCurrent: row.is_current,
    expiryDate: row.expiry_date,
    uploadedAt: row.uploaded_at,
    ocrConfidence: row.ocr_confidence ?? null,
  };
}

export class ServerProducerDocumentsRepository implements IProducerDocumentsRepository {
  constructor(
    private readonly tenantId: string,
    private readonly userId: string
  ) {}

  async list(): Promise<ProducerDocument[]> {
    const producerId = await findProducerIdForUserOrTenant(this.tenantId, this.userId);
    if (!producerId) {
      return [];
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const result = await supabaseAdmin
      .from("producer_documents")
      .select(
        "id,tenant_id,producer_id,document_type_id,file_storage_key,file_hash,uploaded_at,status,is_current,expiry_date,ocr_confidence,document_type:document_types(key,name)"
      )
      .eq("tenant_id", this.tenantId)
      .eq("producer_id", producerId)
      .order("uploaded_at", { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []).map((row) => mapProducerDocument(row as ProducerDocumentRow));
  }

  async upload(file: File, documentTypeKey: string, expiryDate?: string): Promise<ProducerDocument> {
    await ensureBucketExists(DOCUMENTS_BUCKET);

    const producerId = await findProducerIdForUserOrTenant(this.tenantId, this.userId);
    if (!producerId) {
      throw new Error(`No existe perfil productor para tenant=${this.tenantId}.`);
    }

    const normalizedKey = documentTypeKey.toLowerCase();
    const typeMeta = PERSONAL_DOCUMENT_TYPE_META[normalizedKey];
    if (!typeMeta) {
      throw new Error("Tipo de documento no reconocido.");
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const typeUpsertResult = await supabaseAdmin
      .from("document_types")
      .upsert(
        { key: normalizedKey, name: typeMeta.name, requires_expiry: typeMeta.requiresExpiry },
        { onConflict: "key", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (typeUpsertResult.error || !typeUpsertResult.data) {
      throw new Error(typeUpsertResult.error?.message ?? "No se pudo resolver el tipo de documento.");
    }

    const calculatedHash = await calculateFileHash(file);
    const fileStorageKey = `${this.tenantId}/${producerId}/personal/${normalizedKey}/${Date.now()}_${file.name}`;
    await uploadFileToSupabase(file, fileStorageKey);

    await supabaseAdmin
      .from("producer_documents")
      .update({ is_current: false })
      .eq("tenant_id", this.tenantId)
      .eq("producer_id", producerId)
      .eq("document_type_id", typeUpsertResult.data.id)
      .eq("is_current", true);

    const insertResult = await supabaseAdmin
      .from("producer_documents")
      .insert({
        tenant_id: this.tenantId,
        producer_id: producerId,
        document_type_id: typeUpsertResult.data.id,
        file_storage_key: fileStorageKey,
        file_hash: calculatedHash,
        status: "pending",
        is_current: true,
        expiry_date: expiryDate || null,
      })
      .select(
        "id,tenant_id,producer_id,document_type_id,file_storage_key,file_hash,uploaded_at,status,is_current,expiry_date,ocr_confidence,document_type:document_types(key,name)"
      )
      .single();

    if (insertResult.error || !insertResult.data) {
      throw new Error(insertResult.error?.message ?? "No fue posible registrar documento.");
    }

    return mapProducerDocument(insertResult.data as ProducerDocumentRow);
  }

  async updateStatus(documentId: string, status: string): Promise<void> {
    const producerId = await findProducerIdForUserOrTenant(this.tenantId, this.userId);
    if (!producerId) {
      throw new Error("No existe perfil productor asociado.");
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const result = await supabaseAdmin
      .from("producer_documents")
      .update({ status })
      .eq("tenant_id", this.tenantId)
      .eq("producer_id", producerId)
      .eq("id", documentId);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async delete(documentId: string): Promise<void> {
    const supabaseAdmin = getSupabaseAdminClient();
    const docResult = await supabaseAdmin
      .from("producer_documents")
      .select("file_storage_key")
      .eq("tenant_id", this.tenantId)
      .eq("id", documentId)
      .maybeSingle();

    if (docResult.error || !docResult.data) {
      throw new Error("Documento no encontrado.");
    }

    await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([docResult.data.file_storage_key]);
    const deleteResult = await supabaseAdmin.from("producer_documents").delete().eq("id", documentId);
    if (deleteResult.error) {
      throw new Error(deleteResult.error.message);
    }
  }
}

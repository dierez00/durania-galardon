import type {
  AdminDocumentSourceType,
  AdminProductorDetallado,
  AdminProductorDocument,
  AdminProductorDocumentDetail,
  AdminProductorUpp,
  AdminProductorUppMvz,
  AdminProductorVisitsPaginated,
  ReviewAdminProductorDocumentInput,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import {
  deleteAuthUser,
  fetchAuthUserEmail,
  updateAuthUserEmail,
} from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { DOCUMENTS_BUCKET } from "@/modules/producer/documents/infra/supabase/shared";

type MvzAssignmentSourceRow = {
  upp_id: string;
  mvz_profile_id: string;
  status: string;
  assigned_at: string;
  mvz_profiles: Array<{
    full_name: string;
    license_number: string;
    status: string;
  }> | null;
};

type ProducerDocumentSourceRow = {
  id: string;
  producer_id: string;
  status: "pending" | "validated" | "expired" | "rejected";
  comments: string | null;
  is_current: boolean;
  expiry_date: string | null;
  uploaded_at: string;
  file_storage_key: string;
  extracted_fields: Record<string, unknown> | null;
  ocr_fields: Record<string, unknown> | null;
  ocr_metadata: Record<string, unknown> | null;
  ocr_confidence: number | null;
  document_types: Array<{ name: string }> | { name: string } | null;
};

type UppDocumentSourceRow = {
  id: string;
  upp_id: string;
  status: "pending" | "validated" | "expired" | "rejected";
  comments: string | null;
  is_current: boolean;
  issued_at: string | null;
  expiry_date: string | null;
  uploaded_at: string;
  file_storage_key: string;
  ocr_fields: Record<string, unknown> | null;
  ocr_metadata: Record<string, unknown> | null;
  document_type: string;
  upps: Array<{ producer_id: string; name: string }> | { producer_id: string; name: string } | null;
};

function firstRelation<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapProducerDocument(row: ProducerDocumentSourceRow): AdminProductorDocument {
  const docType = firstRelation(row.document_types);
  return {
    id: row.id,
    sourceType: "producer",
    sourceId: row.producer_id,
    uppId: null,
    uppName: null,
    documentType: docType?.name ?? "Documento",
    fileStorageKey: row.file_storage_key,
    status: row.status,
    comments: row.comments,
    isCurrent: row.is_current,
    issuedAt: null,
    expiryDate: row.expiry_date,
    uploadedAt: row.uploaded_at,
  };
}

function mapUppDocument(row: UppDocumentSourceRow): AdminProductorDocument {
  const upp = firstRelation(row.upps);
  return {
    id: row.id,
    sourceType: "upp",
    sourceId: row.upp_id,
    uppId: row.upp_id,
    uppName: upp?.name ?? null,
    documentType: row.document_type,
    fileStorageKey: row.file_storage_key,
    status: row.status,
    comments: row.comments,
    isCurrent: row.is_current,
    issuedAt: row.issued_at,
    expiryDate: row.expiry_date,
    uploadedAt: row.uploaded_at,
  };
}

export class ServerAdminProductorDetailRepository implements IAdminProductorDetailRepository {
  async getById(id: string): Promise<AdminProductorDetallado | null> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const producerResult = await supabaseAdmin
      .from("producers")
      .select("id,user_id,owner_tenant_id,curp,full_name,status,created_at")
      .eq("id", id)
      .maybeSingle();

    if (producerResult.error) {
      throw new Error(producerResult.error.message);
    }
    if (!producerResult.data) {
      return null;
    }

    const producer = producerResult.data;
    const uppsCountResult = await supabaseAdmin
      .from("upps")
      .select("id", { count: "exact", head: true })
      .eq("producer_id", id);

    const uppIdsResult = await supabaseAdmin.from("upps").select("id").eq("producer_id", id);

    let totalBovinos = 0;
    let totalVisits = 0;
    if (!uppIdsResult.error && (uppIdsResult.data ?? []).length > 0) {
      const uppIds = (uppIdsResult.data ?? []).map((upp) => upp.id);
      const animalsCountResult = await supabaseAdmin
        .from("animals")
        .select("id", { count: "exact", head: true })
        .in("upp_id", uppIds)
        .eq("status", "active");
      totalBovinos = animalsCountResult.count ?? 0;

      const visitsCountResult = await supabaseAdmin
        .from("mvz_visits")
        .select("id", { count: "exact", head: true })
        .in("upp_id", uppIds);
      totalVisits = visitsCountResult.count ?? 0;
    }

    const producerDocsCountResult = await supabaseAdmin
      .from("producer_documents")
      .select("id", { count: "exact", head: true })
      .eq("producer_id", id);

    let uppDocsTotal = 0;
    if (!uppIdsResult.error && (uppIdsResult.data ?? []).length > 0) {
      const uppIds = (uppIdsResult.data ?? []).map((upp) => upp.id);
      const uppDocsCountResult = await supabaseAdmin
        .from("upp_documents")
        .select("id", { count: "exact", head: true })
        .in("upp_id", uppIds);
      uppDocsTotal = uppDocsCountResult.count ?? 0;
    }

    const email = producer.user_id ? await fetchAuthUserEmail(producer.user_id) : null;

    return {
      id: producer.id,
      fullName: producer.full_name,
      curp: producer.curp,
      email,
      status: producer.status,
      createdAt: producer.created_at,
      totalUpps: uppsCountResult.count ?? 0,
      totalBovinos,
      totalDocuments: (producerDocsCountResult.count ?? 0) + uppDocsTotal,
      totalVisits,
    };
  }

  async getUpps(id: string): Promise<AdminProductorUpp[]> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const uppsResult = await supabaseAdmin
      .from("upps")
      .select(
        "id,upp_code,name,address_text,location_lat,location_lng,hectares_total,herd_limit,status,created_at"
      )
      .eq("producer_id", id)
      .order("created_at", { ascending: true });

    if (uppsResult.error) {
      throw new Error(uppsResult.error.message);
    }

    const upps = uppsResult.data ?? [];
    if (upps.length === 0) {
      return [];
    }

    const uppIds = upps.map((upp) => upp.id);
    const animalsResult = await supabaseAdmin
      .from("animals")
      .select("upp_id")
      .in("upp_id", uppIds)
      .eq("status", "active");

    const animalCountByUpp: Record<string, number> = {};
    for (const animal of animalsResult.data ?? []) {
      animalCountByUpp[animal.upp_id] = (animalCountByUpp[animal.upp_id] ?? 0) + 1;
    }

    const mvzAssignmentsResult = await supabaseAdmin
      .from("mvz_upp_assignments")
      .select(
        "id,upp_id,mvz_profile_id,status,assigned_at,mvz_profiles(full_name,license_number,status)"
      )
      .in("upp_id", uppIds)
      .eq("status", "active");

    const mvzByUpp: Record<string, AdminProductorUppMvz[]> = {};
    for (const row of (mvzAssignmentsResult.data ?? []) as MvzAssignmentSourceRow[]) {
      const currentRows = mvzByUpp[row.upp_id] ?? [];
      currentRows.push({
        mvzProfileId: row.mvz_profile_id,
        fullName: row.mvz_profiles?.[0]?.full_name ?? "-",
        licenseNumber: row.mvz_profiles?.[0]?.license_number ?? "-",
        mvzStatus: row.mvz_profiles?.[0]?.status ?? "unknown",
        status: row.status,
        assignedAt: row.assigned_at,
      });
      mvzByUpp[row.upp_id] = currentRows;
    }

    return upps.map((upp) => ({
      id: upp.id,
      uppCode: upp.upp_code,
      name: upp.name,
      addressText: upp.address_text,
      locationLat: upp.location_lat ? Number(upp.location_lat) : null,
      locationLng: upp.location_lng ? Number(upp.location_lng) : null,
      hectaresTotal: upp.hectares_total ? Number(upp.hectares_total) : null,
      herdLimit: upp.herd_limit,
      status: upp.status,
      createdAt: upp.created_at,
      animalCount: animalCountByUpp[upp.id] ?? 0,
      mvzAssignments: mvzByUpp[upp.id] ?? [],
    }));
  }

  async getDocuments(id: string): Promise<AdminProductorDocument[]> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const producerDocsResult = await supabaseAdmin
      .from("producer_documents")
      .select(
        "id,producer_id,status,comments,is_current,expiry_date,uploaded_at,file_storage_key,extracted_fields,ocr_fields,ocr_metadata,ocr_confidence,document_types(name)"
      )
      .eq("producer_id", id)
      .order("uploaded_at", { ascending: false });

    if (producerDocsResult.error) {
      throw new Error(producerDocsResult.error.message);
    }

    const uppDocsResult = await supabaseAdmin
      .from("upp_documents")
      .select(
        "id,upp_id,status,comments,is_current,issued_at,expiry_date,uploaded_at,file_storage_key,ocr_fields,ocr_metadata,document_type,upps!inner(producer_id,name)"
      )
      .eq("upps.producer_id", id)
      .order("uploaded_at", { ascending: false });

    if (uppDocsResult.error) {
      throw new Error(uppDocsResult.error.message);
    }

    const producerDocuments = ((producerDocsResult.data as unknown as ProducerDocumentSourceRow[]) ?? []).map((row) =>
      mapProducerDocument(row)
    );

    const uppDocuments = ((uppDocsResult.data as unknown as UppDocumentSourceRow[]) ?? []).map((row) =>
      mapUppDocument(row)
    );

    return [...producerDocuments, ...uppDocuments].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async getDocumentDetail(
    producerId: string,
    sourceType: AdminDocumentSourceType,
    documentId: string
  ): Promise<AdminProductorDocumentDetail | null> {
    const supabaseAdmin = getSupabaseProvisioningClient();

    if (sourceType === "producer") {
      const result = await supabaseAdmin
        .from("producer_documents")
        .select(
          "id,producer_id,status,comments,is_current,expiry_date,uploaded_at,file_storage_key,extracted_fields,ocr_fields,ocr_metadata,ocr_confidence,document_types(name)"
        )
        .eq("id", documentId)
        .eq("producer_id", producerId)
        .maybeSingle();

      if (result.error) {
        throw new Error(result.error.message);
      }
      if (!result.data) {
        return null;
      }

      const row = result.data as unknown as ProducerDocumentSourceRow;
      const mapped = mapProducerDocument(row);
      return {
        ...mapped,
        extractedFields: row.extracted_fields ?? null,
        ocrFields: row.ocr_fields ?? null,
        ocrMetadata: row.ocr_metadata ?? null,
        ocrConfidence: row.ocr_confidence ?? null,
      };
    }

    const result = await supabaseAdmin
      .from("upp_documents")
      .select(
        "id,upp_id,status,comments,is_current,issued_at,expiry_date,uploaded_at,file_storage_key,ocr_fields,ocr_metadata,document_type,upps!inner(producer_id,name)"
      )
      .eq("id", documentId)
      .eq("upps.producer_id", producerId)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return null;
    }

    const row = result.data as unknown as UppDocumentSourceRow;
    const mapped = mapUppDocument(row);
    return {
      ...mapped,
      extractedFields: null,
      ocrFields: row.ocr_fields ?? null,
      ocrMetadata: row.ocr_metadata ?? null,
      ocrConfidence: null,
    };
  }

  async getDocumentSignedUrl(
    producerId: string,
    sourceType: AdminDocumentSourceType,
    documentId: string
  ): Promise<string | null> {
    const detail = await this.getDocumentDetail(producerId, sourceType, documentId);
    if (!detail) {
      return null;
    }

    const supabaseAdmin = getSupabaseProvisioningClient();
    const signed = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(detail.fileStorageKey, 60 * 10);

    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(signed.error?.message ?? "No se pudo generar URL firmada.");
    }

    return signed.data.signedUrl;
  }

  async reviewDocument(producerId: string, input: ReviewAdminProductorDocumentInput): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();

    if (input.sourceType === "producer") {
      const result = await supabaseAdmin
        .from("producer_documents")
        .update({
          status: input.status,
          comments: input.comments ?? null,
          expiry_date: input.expiryDate ?? null,
        })
        .eq("id", input.documentId)
        .eq("producer_id", producerId)
        .select("id")
        .maybeSingle();

      if (result.error) {
        throw new Error(result.error.message);
      }
      if (!result.data) {
        throw new Error("Documento no encontrado para este productor.");
      }
      return;
    }

    const uppResult = await supabaseAdmin
      .from("upp_documents")
      .select("id,upps!inner(producer_id)")
      .eq("id", input.documentId)
      .eq("upps.producer_id", producerId)
      .maybeSingle();

    if (uppResult.error) {
      throw new Error(uppResult.error.message);
    }
    if (!uppResult.data) {
      throw new Error("Documento no encontrado para este productor.");
    }

    const updateResult = await supabaseAdmin
      .from("upp_documents")
      .update({
        status: input.status,
        comments: input.comments ?? null,
        expiry_date: input.expiryDate ?? null,
      })
      .eq("id", input.documentId);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  async getVisits(id: string, page: number): Promise<AdminProductorVisitsPaginated> {
    const limit = 20;
    const normalizedPage = Math.max(1, page);
    const offset = (normalizedPage - 1) * limit;
    const supabaseAdmin = getSupabaseProvisioningClient();

    const uppIdsResult = await supabaseAdmin.from("upps").select("id").eq("producer_id", id);
    if (uppIdsResult.error) {
      throw new Error(uppIdsResult.error.message);
    }
    if ((uppIdsResult.data ?? []).length === 0) {
      return { visits: [], total: 0, page: normalizedPage, limit };
    }

    const uppIds = (uppIdsResult.data ?? []).map((upp) => upp.id);

    type VisitRow = {
      id: string;
      upp_id: string;
      visit_type: string;
      status: string;
      scheduled_at: string;
      finished_at: string | null;
      upps: Array<{ name: string }> | null;
      mvz_profiles: Array<{ full_name: string; license_number: string }> | null;
    };

    const visitsResult = await supabaseAdmin
      .from("mvz_visits")
      .select(
        "id,upp_id,mvz_profile_id,visit_type,status,scheduled_at,finished_at,created_at,upps(name),mvz_profiles(full_name,license_number)",
        { count: "exact" }
      )
      .in("upp_id", uppIds)
      .order("scheduled_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (visitsResult.error) {
      throw new Error(visitsResult.error.message);
    }

    return {
      visits: ((visitsResult.data as VisitRow[]) ?? []).map((visit) => ({
        id: visit.id,
        uppId: visit.upp_id,
        uppName: visit.upps?.[0]?.name ?? "-",
        mvzFullName: visit.mvz_profiles?.[0]?.full_name ?? "-",
        mvzLicense: visit.mvz_profiles?.[0]?.license_number ?? "-",
        visitType: visit.visit_type,
        status: visit.status,
        scheduledAt: visit.scheduled_at,
        finishedAt: visit.finished_at,
      })),
      total: visitsResult.count ?? 0,
      page: normalizedPage,
      limit,
    };
  }

  async updateStatus(id: string, status: "active" | "inactive"): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const updateResult = await supabaseAdmin.from("producers").update({ status }).eq("id", id);
    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  async updateProfile(id: string, payload: { fullName?: string; curp?: string | null }): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const updatePayload: Record<string, unknown> = {};
    if (payload.fullName !== undefined) {
      updatePayload.full_name = payload.fullName;
    }
    if (payload.curp !== undefined) {
      updatePayload.curp = payload.curp;
    }

    const updateResult = await supabaseAdmin.from("producers").update(updatePayload).eq("id", id);
    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  async updateEmail(id: string, email: string): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const producerResult = await supabaseAdmin
      .from("producers")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (producerResult.error) {
      throw new Error(producerResult.error.message);
    }

    const userId = producerResult.data?.user_id;
    if (!userId) {
      throw new Error("No existe usuario Auth asociado al productor.");
    }

    const ok = await updateAuthUserEmail(userId, email);
    if (!ok) {
      throw new Error("No fue posible actualizar el correo.");
    }
  }

  async deleteProductor(id: string): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const producerResult = await supabaseAdmin
      .from("producers")
      .select("id,user_id")
      .eq("id", id)
      .maybeSingle();

    if (producerResult.error || !producerResult.data) {
      throw new Error("No existe productor con ese id.");
    }

    const updateResult = await supabaseAdmin
      .from("producers")
      .update({ status: "inactive" })
      .eq("id", id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    if (producerResult.data.user_id) {
      await deleteAuthUser(producerResult.data.user_id);
    }
  }
}

import type {
  AdminProductorDetallado,
  AdminProductorDocument,
  AdminProductorUpp,
  AdminProductorUppMvz,
  AdminProductorVisitsPaginated,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import {
  deleteAuthUser,
  fetchAuthUserEmail,
  updateAuthUserEmail,
} from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

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

    const docsCountResult = await supabaseAdmin
      .from("producer_documents")
      .select("id", { count: "exact", head: true })
      .eq("producer_id", id);

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
      totalDocuments: docsCountResult.count ?? 0,
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
    type DocumentRow = {
      id: string;
      status: string;
      is_current: boolean;
      expiry_date: string | null;
      uploaded_at: string;
      document_types: { name: string } | null;
    };

    const docsResult = await supabaseAdmin
      .from("producer_documents")
      .select("id,status,is_current,expiry_date,uploaded_at,document_types(name)")
      .eq("producer_id", id)
      .order("uploaded_at", { ascending: false });

    if (docsResult.error) {
      throw new Error(docsResult.error.message);
    }

    return ((docsResult.data as unknown as DocumentRow[]) ?? []).map((doc) => ({
      id: doc.id,
      documentType: doc.document_types?.name ?? "Documento",
      status: doc.status,
      isCurrent: doc.is_current,
      expiryDate: doc.expiry_date,
      uploadedAt: doc.uploaded_at,
    }));
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

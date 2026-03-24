import type {
  AdminMvzAvailableUpp,
  AdminMvzDetallado,
  AdminMvzTest,
  AdminMvzUpp,
  AdminMvzVisitsPaginated,
} from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";
import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";
import {
  deleteAuthUser,
  fetchAuthUserEmail,
  updateAuthUserEmail,
} from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

export class ServerAdminMvzDetailRepository implements IAdminMvzDetailRepository {
  constructor(private readonly actingUserId?: string) {}

  async getById(id: string): Promise<AdminMvzDetallado | null> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const mvzResult = await supabaseAdmin
      .from("mvz_profiles")
      .select("id,user_id,owner_tenant_id,full_name,license_number,status,created_at")
      .eq("id", id)
      .maybeSingle();

    if (mvzResult.error) {
      throw new Error(mvzResult.error.message);
    }
    if (!mvzResult.data) {
      return null;
    }

    const mvz = mvzResult.data;
    const totalUppsResult = await supabaseAdmin
      .from("mvz_upp_assignments")
      .select("id", { count: "exact", head: true })
      .eq("mvz_profile_id", id);
    const activeUppsResult = await supabaseAdmin
      .from("mvz_upp_assignments")
      .select("id", { count: "exact", head: true })
      .eq("mvz_profile_id", id)
      .eq("status", "active");
    const testsCountResult = await supabaseAdmin
      .from("field_tests")
      .select("id", { count: "exact", head: true })
      .eq("mvz_profile_id", id);
    const visitsCountResult = await supabaseAdmin
      .from("mvz_visits")
      .select("id", { count: "exact", head: true })
      .eq("mvz_profile_id", id);

    const email = mvz.user_id ? await fetchAuthUserEmail(mvz.user_id) : null;

    return {
      id: mvz.id,
      fullName: mvz.full_name,
      licenseNumber: mvz.license_number,
      email,
      status: mvz.status,
      createdAt: mvz.created_at,
      totalUpps: totalUppsResult.count ?? 0,
      activeAssignments: activeUppsResult.count ?? 0,
      totalTests: testsCountResult.count ?? 0,
      totalVisits: visitsCountResult.count ?? 0,
    };
  }

  async getUpps(id: string): Promise<AdminMvzUpp[]> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    type AssignmentRow = {
      upp_id: string;
      upps: {
        id: string;
        upp_code: string | null;
        name: string;
        address_text: string | null;
        status: string;
        producers: { full_name: string } | null;
      } | null;
    };

    const assignmentsResult = await supabaseAdmin
      .from("mvz_upp_assignments")
      .select(
        "id,upp_id,status,assigned_at,upps(id,upp_code,name,address_text,status,producer_id,producers(full_name))"
      )
      .eq("mvz_profile_id", id)
      .order("assigned_at", { ascending: true });

    if (assignmentsResult.error) {
      throw new Error(assignmentsResult.error.message);
    }

    const rows = (assignmentsResult.data ?? []) as unknown as AssignmentRow[];
    if (rows.length === 0) {
      return [];
    }

    const uppIds = rows.map((row) => row.upp_id).filter(Boolean);
    const animalsResult = await supabaseAdmin
      .from("animals")
      .select("upp_id")
      .in("upp_id", uppIds)
      .eq("status", "active");

    const animalCountByUpp: Record<string, number> = {};
    for (const animal of animalsResult.data ?? []) {
      animalCountByUpp[animal.upp_id as string] =
        (animalCountByUpp[animal.upp_id as string] ?? 0) + 1;
    }

    return rows
      .filter((row) => row.upps !== null)
      .map((row) => ({
        id: row.upps!.id,
        uppCode: row.upps!.upp_code,
        name: row.upps!.name,
        addressText: row.upps!.address_text,
        status: row.upps!.status,
        animalCount: animalCountByUpp[row.upp_id] ?? 0,
        producerName: row.upps!.producers?.full_name ?? "-",
      }));
  }

  async getAvailableUpps(_mvzId: string): Promise<AdminMvzAvailableUpp[]> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const taken = await supabaseAdmin
      .from("mvz_upp_assignments")
      .select("upp_id")
      .eq("status", "active");

    if (taken.error) {
      throw new Error(taken.error.message);
    }

    const takenIds = (taken.data ?? []).map((row) => row.upp_id as string);
    type UppRow = {
      id: string;
      upp_code: string | null;
      name: string;
      address_text: string | null;
      producers: { full_name: string } | null;
    };

    let query = supabaseAdmin
      .from("upps")
      .select("id,upp_code,name,address_text,producers(full_name)")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (takenIds.length > 0) {
      query = query.not("id", "in", `(${takenIds.join(",")})`);
    }

    const uppsResult = await query;
    if (uppsResult.error) {
      throw new Error(uppsResult.error.message);
    }

    const uppRows = (uppsResult.data ?? []) as unknown as UppRow[];
    if (uppRows.length === 0) {
      return [];
    }

    const uppIds = uppRows.map((row) => row.id);
    const animalsResult = await supabaseAdmin
      .from("animals")
      .select("upp_id")
      .in("upp_id", uppIds)
      .eq("status", "active");

    const animalCountByUpp: Record<string, number> = {};
    for (const animal of animalsResult.data ?? []) {
      animalCountByUpp[animal.upp_id as string] =
        (animalCountByUpp[animal.upp_id as string] ?? 0) + 1;
    }

    return uppRows.map((row) => ({
      id: row.id,
      uppCode: row.upp_code,
      name: row.name,
      addressText: row.address_text,
      animalCount: animalCountByUpp[row.id] ?? 0,
      producerName: row.producers?.full_name ?? "-",
    }));
  }

  async assignUpp(mvzId: string, uppId: string): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const result = await supabaseAdmin
      .from("mvz_upp_assignments")
      .upsert(
        {
          mvz_profile_id: mvzId,
          upp_id: uppId,
          status: "active",
          assigned_by_user_id: this.actingUserId ?? null,
          assigned_at: new Date().toISOString(),
          unassigned_at: null,
        },
        { onConflict: "mvz_profile_id,upp_id" }
      );

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async unassignUpp(mvzId: string, uppId: string): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const result = await supabaseAdmin
      .from("mvz_upp_assignments")
      .update({
        status: "inactive",
        unassigned_at: new Date().toISOString(),
      })
      .eq("mvz_profile_id", mvzId)
      .eq("upp_id", uppId)
      .eq("status", "active");

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async getTests(id: string): Promise<AdminMvzTest[]> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    type TestRow = {
      id: string;
      sample_date: string;
      result: string;
      created_at: string;
      animals: { siniiga_tag: string } | null;
      test_types: { name: string } | null;
    };

    const testsResult = await supabaseAdmin
      .from("field_tests")
      .select("id,sample_date,result,created_at,animals(siniiga_tag),test_types(name)")
      .eq("mvz_profile_id", id)
      .order("created_at", { ascending: false });

    if (testsResult.error) {
      throw new Error(testsResult.error.message);
    }

    return ((testsResult.data as unknown as TestRow[]) ?? []).map((test) => ({
      id: test.id,
      animalTag: test.animals?.siniiga_tag ?? "-",
      testTypeName: test.test_types?.name ?? "-",
      sampleDate: test.sample_date,
      result: test.result,
      createdAt: test.created_at,
    }));
  }

  async getVisits(id: string, page: number): Promise<AdminMvzVisitsPaginated> {
    const limit = 20;
    const normalizedPage = Math.max(1, page);
    const offset = (normalizedPage - 1) * limit;
    const supabaseAdmin = getSupabaseProvisioningClient();
    type VisitRow = {
      id: string;
      upp_id: string;
      visit_type: string;
      status: string;
      scheduled_at: string;
      finished_at: string | null;
      upps: { name: string } | null;
    };

    const visitsResult = await supabaseAdmin
      .from("mvz_visits")
      .select(
        "id,upp_id,visit_type,status,scheduled_at,finished_at,created_at,upps(name)",
        { count: "exact" }
      )
      .eq("mvz_profile_id", id)
      .order("scheduled_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (visitsResult.error) {
      throw new Error(visitsResult.error.message);
    }

    return {
      visits: ((visitsResult.data as unknown as VisitRow[]) ?? []).map((visit) => ({
        id: visit.id,
        uppId: visit.upp_id,
        uppName: visit.upps?.name ?? "-",
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
    const updateResult = await supabaseAdmin.from("mvz_profiles").update({ status }).eq("id", id);
    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  async updateProfile(id: string, payload: { fullName?: string; licenseNumber?: string }): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const updatePayload: Record<string, unknown> = {};
    if (payload.fullName !== undefined) {
      updatePayload.full_name = payload.fullName;
    }
    if (payload.licenseNumber !== undefined) {
      updatePayload.license_number = payload.licenseNumber;
    }

    const updateResult = await supabaseAdmin.from("mvz_profiles").update(updatePayload).eq("id", id);
    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  async updateEmail(id: string, email: string): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const mvzResult = await supabaseAdmin
      .from("mvz_profiles")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (mvzResult.error) {
      throw new Error(mvzResult.error.message);
    }

    const userId = mvzResult.data?.user_id;
    if (!userId) {
      throw new Error("No existe usuario Auth asociado al MVZ.");
    }

    const ok = await updateAuthUserEmail(userId, email);
    if (!ok) {
      throw new Error("No fue posible actualizar el correo.");
    }
  }

  async deleteMvz(id: string): Promise<void> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const mvzResult = await supabaseAdmin
      .from("mvz_profiles")
      .select("id,user_id")
      .eq("id", id)
      .maybeSingle();

    if (mvzResult.error || !mvzResult.data) {
      throw new Error("No existe MVZ con ese id.");
    }

    const updateResult = await supabaseAdmin
      .from("mvz_profiles")
      .update({ status: "inactive" })
      .eq("id", id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    if (mvzResult.data.user_id) {
      await deleteAuthUser(mvzResult.data.user_id);
    }
  }
}

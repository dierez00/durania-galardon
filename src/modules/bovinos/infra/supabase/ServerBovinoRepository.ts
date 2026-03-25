import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import type { BovinoExport } from "@/modules/bovinos/domain/entities/BovinoExport";
import type { BovinoFieldTest } from "@/modules/bovinos/domain/entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "@/modules/bovinos/domain/entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "@/modules/bovinos/domain/entities/BovinoVaccination";
import type { BovinoRepository } from "@/modules/bovinos/domain/repositories/BovinoRepository";
import { toDomainBovino, type BovinoApiRecord } from "@/modules/bovinos/infra/mappers/bovino.mapper";
import {
  toDomainFieldTest,
  type FieldTestApiRecord,
} from "@/modules/bovinos/infra/mappers/fieldTest.mapper";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export class ServerBovinoRepository implements BovinoRepository {
  constructor(
    private readonly tenantId: string,
    private readonly accessibleUppIds: string[] = []
  ) {}

  async list(uppId?: string | null): Promise<Bovino[]> {
    const scopedUppIds = uppId ? this.accessibleUppIds.filter((accessibleUppId) => accessibleUppId === uppId) : this.accessibleUppIds;

    if (scopedUppIds.length === 0) {
      return [];
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const animalsResult = await supabaseAdmin
      .from("v_animals_sanitary")
      .select(
        "animal_id,upp_id,upp_name,upp_code,siniiga_tag,name,sex,birth_date,breed,weight_kg,age_years,health_status,last_vaccine_at,animal_status,mother_animal_id,current_collar_uuid,current_collar_id,current_collar_status,current_collar_linked_at,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
      )
      .eq("tenant_id", this.tenantId)
      .in("upp_id", scopedUppIds)
      .order("siniiga_tag", { ascending: true });

    if (animalsResult.error) {
      throw new Error(animalsResult.error.message);
    }

    const uppStatusMap = await this.fetchUppStatuses(scopedUppIds);

    return (animalsResult.data ?? []).map((row) =>
      toDomainBovino({
        id: row.animal_id,
        upp_id: row.upp_id,
        upp_name: row.upp_name,
        upp_code: row.upp_code,
        upp_status: uppStatusMap[row.upp_id] ?? "active",
        siniiga_tag: row.siniiga_tag,
        name: row.name,
        sex: row.sex,
        birth_date: row.birth_date,
        breed: row.breed,
        weight_kg: row.weight_kg,
        age_years: row.age_years,
        health_status: row.health_status,
        last_vaccine_at: row.last_vaccine_at,
        status: row.animal_status,
        mother_animal_id: row.mother_animal_id,
        current_collar_uuid: row.current_collar_uuid,
        current_collar_id: row.current_collar_id,
        current_collar_status: row.current_collar_status,
        current_collar_linked_at: row.current_collar_linked_at,
        sanitary: {
          tb_date: row.tb_date,
          tb_result: row.tb_result,
          tb_valid_until: row.tb_valid_until,
          tb_status: row.tb_status,
          br_date: row.br_date,
          br_result: row.br_result,
          br_valid_until: row.br_valid_until,
          br_status: row.br_status,
          alert: row.sanitary_alert,
        },
      } satisfies BovinoApiRecord)
    );
  }

  async getById(id: string): Promise<Bovino | null> {
    const supabaseAdmin = getSupabaseAdminClient();
    const animalResult = await supabaseAdmin
      .from("v_animals_sanitary")
      .select(
        "animal_id,upp_id,upp_name,upp_code,siniiga_tag,name,sex,birth_date,breed,weight_kg,age_years,health_status,last_vaccine_at,animal_status,mother_animal_id,current_collar_uuid,current_collar_id,current_collar_status,current_collar_linked_at,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
      )
      .eq("tenant_id", this.tenantId)
      .eq("animal_id", id)
      .maybeSingle();

    if (animalResult.error) {
      throw new Error(animalResult.error.message);
    }
    if (!animalResult.data) {
      return null;
    }

    const uppStatusMap = await this.fetchUppStatuses([animalResult.data.upp_id]);

    return toDomainBovino({
      id: animalResult.data.animal_id,
      upp_id: animalResult.data.upp_id,
      upp_name: animalResult.data.upp_name,
      upp_code: animalResult.data.upp_code,
      upp_status: uppStatusMap[animalResult.data.upp_id] ?? "active",
      siniiga_tag: animalResult.data.siniiga_tag,
      name: animalResult.data.name,
      sex: animalResult.data.sex,
      birth_date: animalResult.data.birth_date,
      breed: animalResult.data.breed,
      weight_kg: animalResult.data.weight_kg,
      age_years: animalResult.data.age_years,
      health_status: animalResult.data.health_status,
      last_vaccine_at: animalResult.data.last_vaccine_at,
      status: animalResult.data.animal_status,
      mother_animal_id: animalResult.data.mother_animal_id,
      current_collar_uuid: animalResult.data.current_collar_uuid,
      current_collar_id: animalResult.data.current_collar_id,
      current_collar_status: animalResult.data.current_collar_status,
      current_collar_linked_at: animalResult.data.current_collar_linked_at,
      sanitary: {
        tb_date: animalResult.data.tb_date,
        tb_result: animalResult.data.tb_result,
        tb_valid_until: animalResult.data.tb_valid_until,
        tb_status: animalResult.data.tb_status,
        br_date: animalResult.data.br_date,
        br_result: animalResult.data.br_result,
        br_valid_until: animalResult.data.br_valid_until,
        br_status: animalResult.data.br_status,
        alert: animalResult.data.sanitary_alert,
      },
    } satisfies BovinoApiRecord);
  }

  async listFieldTests(animalId: string): Promise<BovinoFieldTest[]> {
    const supabaseAdmin = getSupabaseAdminClient();
    const result = await supabaseAdmin
      .from("field_tests")
      .select(
        "id,animal_id,sample_date,result,valid_until,captured_lat,captured_lng,created_at,test_types(key,name),mvz_profiles(full_name)"
      )
      .eq("animal_id", animalId)
      .eq("tenant_id", this.tenantId)
      .order("sample_date", { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []).map((row) =>
      toDomainFieldTest({
        id: row.id,
        animal_id: row.animal_id,
        test_type_key: (Array.isArray(row.test_types) ? row.test_types[0] : row.test_types)?.key ?? "-",
        test_type_name: (Array.isArray(row.test_types) ? row.test_types[0] : row.test_types)?.name ?? "-",
        sample_date: row.sample_date,
        result: row.result,
        valid_until: row.valid_until,
        mvz_name:
          (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
        captured_lat: row.captured_lat,
        captured_lng: row.captured_lng,
        created_at: row.created_at,
      } satisfies FieldTestApiRecord)
    );
  }

  async listIncidents(animalId: string): Promise<BovinoSanitaryIncident[]> {
    const supabaseAdmin = getSupabaseAdminClient();
    const result = await supabaseAdmin
      .from("sanitary_incidents")
      .select(
        "id,animal_id,incident_type,severity,status,detected_at,resolved_at,description,resolution_notes,created_at,mvz_profiles(full_name)"
      )
      .eq("animal_id", animalId)
      .eq("tenant_id", this.tenantId)
      .order("detected_at", { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []).map((row) => ({
      id: row.id,
      animal_id: row.animal_id,
      incident_type: row.incident_type,
      severity: row.severity,
      status: row.status,
      detected_at: row.detected_at,
      resolved_at: row.resolved_at,
      description: row.description,
      resolution_notes: row.resolution_notes,
      mvz_name:
        (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
      created_at: row.created_at,
    }));
  }

  async listVaccinations(animalId: string): Promise<BovinoVaccination[]> {
    const supabaseAdmin = getSupabaseAdminClient();
    const result = await supabaseAdmin
      .from("animal_vaccinations")
      .select(
        "id,animal_id,vaccine_name,dose,status,applied_at,due_at,notes,created_at,mvz_profiles(full_name)"
      )
      .eq("animal_id", animalId)
      .eq("tenant_id", this.tenantId)
      .order("created_at", { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []).map((row) => ({
      id: row.id,
      animal_id: row.animal_id,
      vaccine_name: row.vaccine_name,
      dose: row.dose,
      status: row.status,
      applied_at: row.applied_at,
      due_at: row.due_at,
      mvz_name:
        (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
      notes: row.notes,
      created_at: row.created_at,
    }));
  }

  async listExports(animalId: string): Promise<BovinoExport[]> {
    const supabaseAdmin = getSupabaseAdminClient();
    const animalResult = await supabaseAdmin
      .from("animals")
      .select("upp_id")
      .eq("id", animalId)
      .eq("tenant_id", this.tenantId)
      .maybeSingle();

    if (animalResult.error) {
      throw new Error(animalResult.error.message);
    }
    if (!animalResult.data) {
      return [];
    }

    const result = await supabaseAdmin
      .from("export_requests")
      .select(
        "id,upp_id,status,compliance_60_rule,tb_br_validated,blue_tag_assigned,monthly_bucket,blocked_reason,created_at,updated_at"
      )
      .eq("upp_id", animalResult.data.upp_id)
      .eq("tenant_id", this.tenantId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []) as BovinoExport[];
  }

  async listOffspring(animalId: string): Promise<Bovino[]> {
    const supabaseAdmin = getSupabaseAdminClient();
    const result = await supabaseAdmin
      .from("v_animals_sanitary")
      .select(
        "animal_id,upp_id,upp_name,upp_code,siniiga_tag,name,sex,birth_date,breed,weight_kg,age_years,health_status,last_vaccine_at,animal_status,mother_animal_id,current_collar_uuid,current_collar_id,current_collar_status,current_collar_linked_at,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
      )
      .eq("tenant_id", this.tenantId)
      .eq("mother_animal_id", animalId)
      .order("birth_date", { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const uppIds = Array.from(new Set((result.data ?? []).map((row) => row.upp_id)));
    const uppStatusMap = await this.fetchUppStatuses(uppIds);

    return (result.data ?? []).map((row) =>
      toDomainBovino({
        id: row.animal_id,
        upp_id: row.upp_id,
        upp_name: row.upp_name,
        upp_code: row.upp_code,
        upp_status: uppStatusMap[row.upp_id] ?? "active",
        siniiga_tag: row.siniiga_tag,
        name: row.name,
        sex: row.sex,
        birth_date: row.birth_date,
        breed: row.breed,
        weight_kg: row.weight_kg,
        age_years: row.age_years,
        health_status: row.health_status,
        last_vaccine_at: row.last_vaccine_at,
        status: row.animal_status,
        mother_animal_id: row.mother_animal_id,
        current_collar_uuid: row.current_collar_uuid,
        current_collar_id: row.current_collar_id,
        current_collar_status: row.current_collar_status,
        current_collar_linked_at: row.current_collar_linked_at,
        sanitary: {
          tb_date: row.tb_date,
          tb_result: row.tb_result,
          tb_valid_until: row.tb_valid_until,
          tb_status: row.tb_status,
          br_date: row.br_date,
          br_result: row.br_result,
          br_valid_until: row.br_valid_until,
          br_status: row.br_status,
          alert: row.sanitary_alert,
        },
      } satisfies BovinoApiRecord)
    );
  }

  private async fetchUppStatuses(uppIds: string[]): Promise<Record<string, string>> {
    if (uppIds.length === 0) {
      return {};
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const uppsResult = await supabaseAdmin.from("upps").select("id,status").in("id", uppIds);
    if (uppsResult.error) {
      throw new Error(uppsResult.error.message);
    }

    return (uppsResult.data ?? []).reduce<Record<string, string>>((accumulator, upp) => {
      accumulator[upp.id] = upp.status;
      return accumulator;
    }, {});
  }
}

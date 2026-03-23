import { createSupabaseRlsServerClient, getSupabaseAdminClient } from "@/server/auth/supabase";
import type {
  ConfirmMovementParams,
  CreateMovementParams,
  MovementRepository,
} from "../../domain/repositories/MovementRepository";
import type { AnimalSnapshot, FieldTestSnapshot } from "../../domain/entities/SanitaryValidation";
import type { Movement } from "../../domain/entities/Movement";
import { toDomainMovement, type MovementRow } from "../mappers/movementMapper";

export class ServerMovementRepository implements MovementRepository {
  constructor(
    private readonly tenantId: string,
    private readonly accessToken: string
  ) {}

  async list(scopedUppIds: string[]): Promise<Movement[]> {
    if (scopedUppIds.length === 0) {
      return [];
    }

    const supabase = createSupabaseRlsServerClient(this.accessToken);
    const result = await supabase
      .from("movement_requests")
      .select(
        "id,tenant_id,producer_id,upp_id,requested_by_user_id,status,qr_code,route_note,incidence_note,movement_date,created_at,updated_at"
      )
      .eq("tenant_id", this.tenantId)
      .in("upp_id", scopedUppIds)
      .order("created_at", { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []).map((row) => toDomainMovement(row as MovementRow));
  }

  async getById(id: string): Promise<Movement | null> {
    const supabase = createSupabaseRlsServerClient(this.accessToken);
    const result = await supabase
      .from("movement_requests")
      .select(
        "id,tenant_id,producer_id,upp_id,requested_by_user_id,status,qr_code,route_note,incidence_note,movement_date,created_at,updated_at"
      )
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return null;
    }

    return toDomainMovement(result.data as MovementRow);
  }

  async getAnimalsByTags(tenantId: string, uppId: string, tags: string[]): Promise<AnimalSnapshot[]> {
    const supabase = getSupabaseAdminClient();
    const result = await supabase
      .from("animals")
      .select("id,upp_id,siniiga_tag,status")
      .eq("tenant_id", tenantId)
      .eq("upp_id", uppId)
      .in("siniiga_tag", tags);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []).map((row) => ({
      id: row.id,
      uppId: row.upp_id,
      siniigaTag: row.siniiga_tag,
      status: row.status,
    }));
  }

  async getLatestFieldTestsByAnimal(tenantId: string, animalIds: string[]): Promise<FieldTestSnapshot[]> {
    if (animalIds.length === 0) {
      return [];
    }

    const supabase = getSupabaseAdminClient();
    const result = await supabase
      .from("field_tests")
      .select("animal_id,result,sample_date,valid_until,test_types(key)")
      .eq("tenant_id", tenantId)
      .in("animal_id", animalIds)
      .order("sample_date", { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const byAnimalAndType = new Map<string, FieldTestSnapshot>();
    for (const row of result.data ?? []) {
      const testType = Array.isArray(row.test_types) ? row.test_types[0] : row.test_types;
      const testTypeKey = testType?.key;
      if (testTypeKey !== "tb" && testTypeKey !== "br") {
        continue;
      }

      const mapKey = `${row.animal_id}:${testTypeKey}`;
      if (byAnimalAndType.has(mapKey)) {
        continue;
      }

      byAnimalAndType.set(mapKey, {
        animalId: row.animal_id,
        testTypeKey,
        result: row.result,
        sampleDate: row.sample_date,
        validUntil: row.valid_until,
      });
    }

    return Array.from(byAnimalAndType.values());
  }

  async hasActiveQuarantine(uppId: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const result = await supabase
      .from("state_quarantines")
      .select("id")
      .eq("upp_id", uppId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return Boolean(result.data?.id);
  }

  async create(params: CreateMovementParams): Promise<Movement> {
    const supabase = createSupabaseRlsServerClient(this.accessToken);
    const createResult = await supabase
      .from("movement_requests")
      .insert({
        tenant_id: params.tenantId,
        producer_id: params.producerId,
        upp_id: params.request.uppId,
        requested_by_user_id: params.requestedByUserId,
        status: "approved",
        qr_code: params.qrCode,
        route_note: params.request.routeNote ?? null,
        movement_date: params.request.movementDate ?? null,
      })
      .select(
        "id,tenant_id,producer_id,upp_id,requested_by_user_id,status,qr_code,route_note,incidence_note,movement_date,created_at,updated_at"
      )
      .single();

    if (createResult.error || !createResult.data) {
      throw new Error(createResult.error?.message ?? "No fue posible crear solicitud de movilización.");
    }

    return toDomainMovement(createResult.data as MovementRow);
  }

  async confirmArrival(params: ConfirmMovementParams): Promise<void> {
    const supabaseAdmin = getSupabaseAdminClient();

    const movementResult = await supabaseAdmin
      .from("movement_requests")
      .select("id,upp_id")
      .eq("tenant_id", params.tenantId)
      .eq("id", params.request.movementId)
      .single();

    if (movementResult.error || !movementResult.data?.upp_id) {
      throw new Error("No fue posible localizar la solicitud de movilización.");
    }

    const originUppId = movementResult.data.upp_id;

    if (params.request.destinationType === "internal") {
      if (!params.request.destinationUppId) {
        throw new Error("Debe indicar destinationUppId para destino interno.");
      }

      const updateAnimalsResult = await supabaseAdmin
        .from("animals")
        .update({ upp_id: params.request.destinationUppId, status: "active" })
        .eq("tenant_id", params.tenantId)
        .eq("upp_id", originUppId)
        .in("siniiga_tag", params.request.receivedTags);

      if (updateAnimalsResult.error) {
        throw new Error(updateAnimalsResult.error.message);
      }
    } else {
      const updateAnimalsResult = await supabaseAdmin
        .from("animals")
        .update({ status: "inactive" })
        .eq("tenant_id", params.tenantId)
        .eq("upp_id", originUppId)
        .in("siniiga_tag", params.request.receivedTags);

      if (updateAnimalsResult.error) {
        throw new Error(updateAnimalsResult.error.message);
      }
    }

    const movementUpdateResult = await supabaseAdmin
      .from("movement_requests")
      .update({
        status: "approved",
        incidence_note: params.incidenceNote,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", params.tenantId)
      .eq("id", params.request.movementId);

    if (movementUpdateResult.error) {
      throw new Error(movementUpdateResult.error.message);
    }
  }
}

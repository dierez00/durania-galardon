import type { ICollarRepository, CollarFilters } from "@/modules/collars/domain/repositories/CollarRepository";
import type { Collar, CollarStatus } from "@/modules/collars/domain/entities/Collar";
import type { CollarAnimalHistory } from "@/modules/collars/domain/entities/CollarAnimalHistory";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import { toDomainCollar } from "../mappers/collar.mapper";

/**
 * Supabase-backed Collar Repository
 * Enforces multi-tenancy via RLS and explicit tenant_id filtering
 * Supports UPP-level access control for producer scope
 */
export class ServerCollarRepository implements ICollarRepository {
  private readonly tenantId: string;
  private readonly accessibleUppIds?: string[];
  private readonly supabase: SupabaseClient; // Supabase client with RLS

  constructor(tenantId: string, accessToken: string, accessibleUppIds?: string[]) {
    this.tenantId = tenantId;
    this.accessibleUppIds = accessibleUppIds;
    this.supabase = createSupabaseRlsServerClient(accessToken);
  }

  async findById(collarId: string): Promise<Collar | null> {
    const { data, error } = await this.supabase
      .from("collars")
      .select("*")
      .eq("id", collarId)
      .eq("tenant_id", this.tenantId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toDomainCollar(data);
  }

  async findByCollarId(collarId: string): Promise<Collar | null> {
    const { data, error } = await this.supabase
      .from("collars")
      .select("*")
      .eq("collar_id", collarId)
      .eq("tenant_id", this.tenantId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toDomainCollar(data);
  }

  async findUnassignedByTenant(limit = 50): Promise<Collar[]> {
    let query = this.supabase
      .from("collars")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .in("status", ["active", "unlinked"])
      .limit(limit);

    // If producer scope, filter to accessible UPPs via animal relation
    if (this.accessibleUppIds && this.accessibleUppIds.length > 0) {
      query = query.in("animals.upp_id", this.accessibleUppIds);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(toDomainCollar);
  }

  async findByTenant(
    limit: number,
    offset: number,
    filters?: CollarFilters
  ): Promise<{ collars: Collar[]; total: number; limit: number; offset: number }> {
    // First, build the base query to count total records
    let countQuery = this.supabase
      .from("collars")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId);

    // Apply filters to count query
    if (filters?.status) {
      countQuery = countQuery.eq("status", filters.status);
    }
    if (filters?.search) {
      countQuery = countQuery.ilike("collar_id", `%${filters.search}%`);
    }
    if (filters?.firmware) {
      countQuery = countQuery.eq("firmware_version", filters.firmware);
    }
    if (filters?.dateFrom) {
      countQuery = countQuery.gte("created_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      countQuery = countQuery.lte("created_at", filters.dateTo);
    }

    const { count, error: countError } = await countQuery;
    const total = countError || count === null ? 0 : count;

    // Then build the paginated data query
    let dataQuery = this.supabase
      .from("collars")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters to data query
    if (filters?.status) {
      dataQuery = dataQuery.eq("status", filters.status);
    }
    if (filters?.search) {
      dataQuery = dataQuery.ilike("collar_id", `%${filters.search}%`);
    }
    if (filters?.firmware) {
      dataQuery = dataQuery.eq("firmware_version", filters.firmware);
    }
    if (filters?.dateFrom) {
      dataQuery = dataQuery.gte("created_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      dataQuery = dataQuery.lte("created_at", filters.dateTo);
    }

    // If producer scope, filter to accessible UPPs via animal relation
    if (this.accessibleUppIds && this.accessibleUppIds.length > 0) {
      dataQuery = dataQuery.in("animals.upp_id", this.accessibleUppIds);
    }

    const { data, error } = await dataQuery;

    if (error || !data) {
      return { collars: [], total, limit, offset };
    }

    return {
      collars: data.map(toDomainCollar),
      total,
      limit,
      offset,
    };
  }

  async findByStatus(status: CollarStatus, limit = 50): Promise<Collar[]> {
    const { data, error } = await this.supabase
      .from("collars")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("status", status)
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(toDomainCollar);
  }

  async create(collar: Omit<Collar, "id" | "created_at" | "updated_at">): Promise<Collar> {
    const { data, error } = await this.supabase
      .from("collars")
      .insert({
        tenant_id: this.tenantId,
        collar_id: collar.collar_id,
        animal_id: collar.animal_id || null,
        status: collar.status,
        firmware_version: collar.firmware_version || null,
        purchased_at: collar.purchased_at || null,
        linked_at: collar.linked_at || null,
        unlinked_at: collar.unlinked_at || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create collar: ${error?.message}`);
    }

    return toDomainCollar(data);
  }

  async updateCollarStatus(
    collarId: string,
    newStatus: CollarStatus,
    linkedAt?: string | null,
    unlinkedAt?: string | null
  ): Promise<Collar> {
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (linkedAt !== undefined) {
      updates.linked_at = linkedAt;
    }
    if (unlinkedAt !== undefined) {
      updates.unlinked_at = unlinkedAt;
    }

    const { data, error } = await this.supabase
      .from("collars")
      .update(updates)
      .eq("id", collarId)
      .eq("tenant_id", this.tenantId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update collar status: ${error?.message}`);
    }

    return toDomainCollar(data);
  }

  async updateCollarAnimal(
    collarId: string,
    animalId: string | null,
    newStatus: CollarStatus
  ): Promise<Collar> {
    const { data, error } = await this.supabase
      .from("collars")
      .update({
        animal_id: animalId,
        status: newStatus,
        linked_at: newStatus === "linked" ? new Date().toISOString() : null,
        unlinked_at: newStatus === "unlinked" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collarId)
      .eq("tenant_id", this.tenantId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update collar animal: ${error?.message}`);
    }

    return toDomainCollar(data);
  }

  async createHistoryEntry(
    history: Omit<CollarAnimalHistory, "id">
  ): Promise<CollarAnimalHistory> {
    const { data, error } = await this.supabase
      .from("collar_animal_history")
      .insert({
        collar_id_fk: history.collar_id_fk,
        animal_id: history.animal_id,
        tenant_id: this.tenantId, // Ensure tenant isolation
        linked_by: history.linked_by || null,
        unlinked_by: history.unlinked_by || null,
        linked_at: history.linked_at,
        unlinked_at: history.unlinked_at || null,
        notes: history.notes || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create history entry: ${error?.message}`);
    }

    return {
      id: data.id,
      collar_id_fk: data.collar_id_fk,
      animal_id: data.animal_id,
      tenant_id: data.tenant_id,
      linked_by: data.linked_by,
      unlinked_by: data.unlinked_by,
      linked_at: data.linked_at,
      unlinked_at: data.unlinked_at,
      notes: data.notes,
    };
  }

  async getHistoryByCollarId(collarId: string): Promise<CollarAnimalHistory[]> {
    const { data, error } = await this.supabase
      .from("collar_animal_history")
      .select("*")
      .eq("collar_id_fk", collarId)
      .eq("tenant_id", this.tenantId)
      .order("linked_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row: Record<string, unknown>) => ({
      id: row.id,
      collar_id_fk: row.collar_id_fk,
      animal_id: row.animal_id,
      tenant_id: row.tenant_id,
      linked_by: row.linked_by,
      unlinked_by: row.unlinked_by,
      linked_at: row.linked_at,
      unlinked_at: row.unlinked_at,
      notes: row.notes,
    })) as CollarAnimalHistory[];
  }

  async save(collar: Collar): Promise<Collar> {
    const { data, error } = await this.supabase
      .from("collars")
      .update({
        collar_id: collar.collar_id,
        animal_id: collar.animal_id,
        status: collar.status,
        firmware_version: collar.firmware_version,
        purchased_at: collar.purchased_at,
        linked_at: collar.linked_at,
        unlinked_at: collar.unlinked_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collar.id)
      .eq("tenant_id", this.tenantId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save collar: ${error?.message}`);
    }

    return toDomainCollar(data);
  }
}

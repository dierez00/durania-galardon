import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { toApiCollar } from "./shared";
import { toDomainCollar } from "../mappers/collar.mapper";
import { collarLinkingService } from "@/modules/collars/domain/services/collarLinkingService";
import type { CollarStatus } from "@/modules/collars/domain/entities/Collar";
import type {
  AdminEditableCollarStatus,
  AdminProvisionCollarDTO,
  AdminUpdateCollarDTO,
} from "../../application/dto/index";

type CollarListRow = {
  id: string;
  tenant_id: string | null;
  collar_id: string;
  status: string;
  firmware_version: string | null;
  purchased_at: string | null;
  linked_at: string | null;
  created_at: string;
};

type ProducerTenantRow = {
  id: string;
  full_name: string;
  owner_tenant_id: string | null;
};

type AdminCollarPatchPayload = Partial<AdminUpdateCollarDTO> & {
  status?: string;
  notes?: string;
  reason?: string;
  producer_id?: string | null;
  collar_id?: string;
  purchased_at?: string;
};

const ADMIN_EDITABLE_STATUS: readonly AdminEditableCollarStatus[] = [
  "inactive",
  "active",
  "suspended",
  "retired",
];

const ASSIGNED_ALLOWED_STATUS: readonly AdminEditableCollarStatus[] = [
  "suspended",
  "retired",
];

function isCollarStatus(value: string): value is CollarStatus {
  return ["inactive", "active", "linked", "unlinked", "suspended", "retired"].includes(value);
}

function isAdminEditableStatus(value: string): value is AdminEditableCollarStatus {
  return ADMIN_EDITABLE_STATUS.includes(value as AdminEditableCollarStatus);
}

function normalizeCollarId(input: string): string {
  return input.trim().toUpperCase();
}

function isValidAdminCollarIdFormat(collarId: string): boolean {
  return /^[A-Z]+-[0-9]{3,}$/.test(collarId);
}

async function getProducerTenantById(
  supabaseAdmin: ReturnType<typeof getSupabaseProvisioningClient>,
  producerId: string
): Promise<{ id: string; owner_tenant_id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("producers")
    .select("id, owner_tenant_id")
    .eq("id", producerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.owner_tenant_id) {
    return null;
  }

  return {
    id: data.id as string,
    owner_tenant_id: data.owner_tenant_id as string,
  };
}

/**
 * POST /api/admin/collars - Provision a new collar
 */
export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.collars.write"],
    resource: "admin.collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: AdminProvisionCollarDTO;
  try {
    body = (await request.json()) as AdminProvisionCollarDTO;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de solicitud no es JSON válido.");
  }

  const { collar_id, firmware_version, producer_id } = body;

  if (!collar_id?.trim()) {
    return apiError("INVALID_PAYLOAD", "El campo 'collar_id' es requerido.");
  }

  try {
    const supabaseAdmin = getSupabaseProvisioningClient();

    // Ensure uniqueness of collar_id
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("collars")
      .select("id")
      .eq("collar_id", collar_id.trim())
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      return apiError(
        "INVALID_PAYLOAD",
        `Ya existe un collar con ID '${collar_id.trim()}'`
      );
    }

    let targetTenantId: string | null = null;

    if (producer_id) {
      const producerRow = await getProducerTenantById(supabaseAdmin, producer_id);

      if (!producerRow) {
        return apiError(
          "INVALID_PAYLOAD",
          "El productor especificado no es válido o no tiene tenant asignado."
        );
      }

      targetTenantId = producerRow.owner_tenant_id as string;
    }

    const nowIso = new Date().toISOString();
    const computedPurchasedAt = targetTenantId ? nowIso : null;
    const status = targetTenantId ? "active" : "inactive";

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("collars")
      .insert({
        collar_id: collar_id.trim(),
        tenant_id: targetTenantId,
        animal_id: null,
        status,
        firmware_version: firmware_version?.trim() || null,
        purchased_at: computedPurchasedAt,
        linked_at: null,
        unlinked_at: null,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "No fue posible crear el collar.");
    }

    const collar = toDomainCollar(inserted as Parameters<typeof toDomainCollar>[0]);

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "admin.collars",
      resourceId: collar.id,
      payload: { collar_id, producer_id: producer_id ?? null },
    });

    return apiSuccess({ collar: toApiCollar(collar) }, { status: 201 });
  } catch (error) {
    return apiError(
      "ADMIN_PROVISION_COLLAR_FAILED",
      error instanceof Error ? error.message : "No fue posible provisionar collar.",
      400
    );
  }
}

/**
 * GET /api/admin/collars - List collars
 */
export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.collars.read"],
    resource: "admin.collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const skipParam = parseInt(url.searchParams.get("skip") || "0", 10);
  const offset = Number.isNaN(skipParam) || skipParam < 0 ? 0 : skipParam;

  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const firmware = url.searchParams.get("firmware") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;
  const producerId = url.searchParams.get("producerId") || undefined;
  const sortBy = url.searchParams.get("sortBy") || "linked_at";
  const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  try {
    const supabaseAdmin = getSupabaseProvisioningClient();

    let tenantFilter: string | undefined;
    if (producerId) {
      const { data: producerRow, error: producerError } = await supabaseAdmin
        .from("producers")
        .select("id, owner_tenant_id")
        .eq("id", producerId)
        .maybeSingle();

      if (producerError) {
        throw new Error(producerError.message);
      }

      if (!producerRow?.owner_tenant_id) {
        return apiSuccess({ collars: [], total: 0, limit, skip: offset });
      }

      tenantFilter = producerRow.owner_tenant_id as string;
    }

    // Base query: global list of collars for government admin
    let countQuery = supabaseAdmin
      .from("collars")
      .select("id", { count: "exact", head: true });

    if (tenantFilter) {
      countQuery = countQuery.eq("tenant_id", tenantFilter);
    }

    if (status) {
      countQuery = countQuery.eq("status", status);
    }
    if (search) {
      countQuery = countQuery.ilike("collar_id", `%${search}%`);
    }
    if (firmware) {
      countQuery = countQuery.ilike("firmware_version", `%${firmware}%`);
    }
    if (dateFrom) {
      countQuery = countQuery.gte("linked_at", dateFrom);
    }
    if (dateTo) {
      countQuery = countQuery.lte("linked_at", `${dateTo}T23:59:59`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      throw new Error(countError.message);
    }

    const total = count ?? 0;

    // Data query with pagination
    let dataQuery = supabaseAdmin
      .from("collars")
      .select(
        "id, tenant_id, collar_id, status, firmware_version, purchased_at, linked_at, created_at"
      );

    if (tenantFilter) {
      dataQuery = dataQuery.eq("tenant_id", tenantFilter);
    }

    if (status) {
      dataQuery = dataQuery.eq("status", status);
    }
    if (search) {
      dataQuery = dataQuery.ilike("collar_id", `%${search}%`);
    }
    if (firmware) {
      dataQuery = dataQuery.ilike("firmware_version", `%${firmware}%`);
    }
    if (dateFrom) {
      dataQuery = dataQuery.gte("linked_at", dateFrom);
    }
    if (dateTo) {
      dataQuery = dataQuery.lte("linked_at", `${dateTo}T23:59:59`);
    }

    const sortColumn =
      sortBy === "collar_id"
        ? "collar_id"
        : sortBy === "status"
          ? "status"
          : sortBy === "purchased_at"
            ? "purchased_at"
          : sortBy === "firmware"
            ? "firmware_version"
            : "linked_at";

    dataQuery = dataQuery
      .order(sortColumn, { ascending: sortDir === "asc" })
      .range(offset, offset + limit - 1);

    const { data, error } = await dataQuery;
    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as CollarListRow[];
    const tenantIds = Array.from(
      new Set(
        rows
          .map((row) => row.tenant_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let producerByTenantId: Record<string, { id: string; full_name: string }> = {};
    if (tenantIds.length > 0) {
      const { data: producersData, error: producersError } = await supabaseAdmin
        .from("producers")
        .select("id, full_name, owner_tenant_id")
        .in("owner_tenant_id", tenantIds);

      if (producersError) {
        throw new Error(producersError.message);
      }

      producerByTenantId = ((producersData ?? []) as ProducerTenantRow[]).reduce(
        (acc: Record<string, { id: string; full_name: string }>, row) => {
          if (row.owner_tenant_id) {
            acc[row.owner_tenant_id] = {
              id: row.id,
              full_name: row.full_name,
            };
          }
          return acc;
        },
        {}
      );
    }

    const apiCollars = rows.map((row) => {
      const producer = row.tenant_id ? producerByTenantId[row.tenant_id] : undefined;

      return {
        id: row.id,
        collar_id: row.collar_id,
        producer_id: producer?.id ?? "",
        producer_name: producer?.full_name ?? "",
        firmware_version: row.firmware_version ?? "",
        status: row.status,
        linked_at: row.linked_at ?? null,
        purchased_at: row.purchased_at ?? null,
        created_at: row.created_at,
      };
    });

    return apiSuccess({
      collars: apiCollars,
      total,
      limit,
      skip: offset,
    });
  } catch (error) {
    return apiError(
      "ADMIN_LIST_COLLARS_FAILED",
      error instanceof Error ? error.message : "No fue posible listar collares.",
      500
    );
  }
}

/**
 * GET /api/admin/collars/[collarId] - Get collar detail for admin panel
 */
export async function getDetail(
  request: Request,
  { params }: { params: Promise<{ collarId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.collars.read"],
    resource: "admin.collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { collarId } = await params;
    const supabaseAdmin = getSupabaseProvisioningClient();

    const { data: collarRow, error: collarError } = await supabaseAdmin
      .from("collars")
      .select("*")
      .eq("id", collarId)
      .maybeSingle();

    if (collarError) {
      throw new Error(collarError.message);
    }

    if (!collarRow) {
      return apiError("NOT_FOUND", "Collar no encontrado.", 404);
    }

    const collar = toDomainCollar(collarRow as Parameters<typeof toDomainCollar>[0]);

    let producer: { id: string; fullName: string } | null = null;
    if (collar.tenant_id) {
      const { data: producerRow, error: producerError } = await supabaseAdmin
        .from("producers")
        .select("id, full_name")
        .eq("owner_tenant_id", collar.tenant_id)
        .maybeSingle();

      if (producerError) {
        throw new Error(producerError.message);
      }

      if (producerRow) {
        producer = {
          id: producerRow.id as string,
          fullName: producerRow.full_name as string,
        };
      }
    }

    let animal: { id: string; name: string } | null = null;
    if (collar.animal_id) {
      const { data: animalRow, error: animalError } = await supabaseAdmin
        .from("animals")
        .select("id, name")
        .eq("id", collar.animal_id)
        .maybeSingle();

      if (animalError) {
        throw new Error(animalError.message);
      }

      if (animalRow) {
        animal = {
          id: animalRow.id as string,
          name: (animalRow.name as string | null) ?? "Sin nombre",
        };
      }
    }

    return apiSuccess({
      collar: toApiCollar(collar),
      producer,
      animal,
    });
  } catch (error) {
    return apiError(
      "ADMIN_GET_COLLAR_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar collar.",
      500
    );
  }
}

/**
 * PATCH /api/admin/collars/[collarId] - Update collar status and/or producer assignment
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ collarId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.collars.write"],
    resource: "admin.collars",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { collarId } = await params;

    const body = (await request.json()) as AdminCollarPatchPayload;

    const { status, producer_id, collar_id, purchased_at } = body;
    const notes = typeof body.notes === "string" ? body.notes : body.reason;

    const supabaseAdmin = getSupabaseProvisioningClient();

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("collars")
      .select("*")
      .eq("id", collarId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!existing) {
      return apiError("NOT_FOUND", "Collar no encontrado.", 404);
    }

    const currentStatus = existing.status as string;
    if (!isCollarStatus(currentStatus)) {
      return apiError("INVALID_STATE", `Estado actual de collar inválido: '${currentStatus}'.`, 409);
    }

    const isAlreadyAssigned = Boolean(existing.tenant_id);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof status === "string") {
      if (!isAdminEditableStatus(status)) {
        return apiError("INVALID_PAYLOAD", `Estado de collar inválido: '${status}'.`, 400);
      }

      if (isAlreadyAssigned && !ASSIGNED_ALLOWED_STATUS.includes(status)) {
        return apiError(
          "INVALID_STATE_TRANSITION",
          "Un collar ya asignado sólo puede cambiar a estado suspended o retired.",
          409
        );
      }

      const transition = collarLinkingService.validateStatusChange(currentStatus, status);
      if (!transition.valid) {
        return apiError("INVALID_STATE_TRANSITION", transition.message ?? "Transición inválida.", 409);
      }

      updates.status = status;
    }

    if (typeof collar_id === "string") {
      const normalizedCollarId = normalizeCollarId(collar_id);
      if (!isValidAdminCollarIdFormat(normalizedCollarId)) {
        return apiError(
          "INVALID_PAYLOAD",
          "El collar_id debe estar en mayúsculas con formato tipo COLLAR-004.",
          400
        );
      }

      if (normalizedCollarId !== existing.collar_id) {
        const { data: duplicateRow, error: duplicateError } = await supabaseAdmin
          .from("collars")
          .select("id")
          .eq("collar_id", normalizedCollarId)
          .neq("id", collarId)
          .maybeSingle();

        if (duplicateError) {
          throw new Error(duplicateError.message);
        }

        if (duplicateRow) {
          return apiError(
            "COLLAR_ID_ALREADY_EXISTS",
            `Ya existe un collar con ID '${normalizedCollarId}'.`,
            409
          );
        }

        updates.collar_id = normalizedCollarId;
      }
    }

    if (typeof purchased_at === "string") {
      const purchasedAtDate = new Date(purchased_at);
      if (Number.isNaN(purchasedAtDate.getTime())) {
        return apiError("INVALID_PAYLOAD", "La fecha de compra no tiene un formato válido.", 400);
      }

      const now = new Date();
      if (purchasedAtDate.getTime() > now.getTime()) {
        return apiError("INVALID_PAYLOAD", "La fecha de compra no puede ser futura.", 400);
      }

      updates.purchased_at = purchasedAtDate.toISOString();
    }

    if (producer_id) {
      const producerRow = await getProducerTenantById(supabaseAdmin, producer_id);

      if (!producerRow) {
        return apiError(
          "INVALID_PAYLOAD",
          "El productor especificado no es válido o no tiene tenant asignado."
        );
      }

      const newTenantId = producerRow.owner_tenant_id as string;

      if (isAlreadyAssigned && newTenantId !== existing.tenant_id) {
        return apiError(
          "COLLAR_ALREADY_ASSIGNED",
          "Este collar ya está asignado y no puede reasignarse a otro productor.",
          409
        );
      }

      updates.tenant_id = newTenantId;

      // Business rule: assigning an unassigned collar to a producer activates it automatically.
      if (!isAlreadyAssigned) {
        updates.status = "active";
      }

      if (!existing.purchased_at) {
        updates.purchased_at = new Date().toISOString();
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("collars")
      .update(updates)
      .eq("id", collarId)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "No fue posible actualizar collar.");
    }

    const collar = toDomainCollar(updated as Parameters<typeof toDomainCollar>[0]);

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "status_change",
      resource: "admin.collars",
      resourceId: collarId,
      payload: {
        status_before: existing.status,
        status_after: status ?? collar.status,
        collar_id_before: existing.collar_id,
        collar_id_after: (updates.collar_id as string | undefined) ?? collar.collar_id,
        producer_id: producer_id ?? null,
        purchased_at: (updates.purchased_at as string | undefined) ?? collar.purchased_at,
        notes,
      },
    });

    return apiSuccess({ collar: toApiCollar(collar) });
  } catch (error) {
    return apiError(
      "ADMIN_UPDATE_COLLAR_FAILED",
      error instanceof Error ? error.message : "No fue posible actualizar collar.",
      400
    );
  }
}

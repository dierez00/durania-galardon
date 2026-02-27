import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { createAuthUser, deleteAuthUser } from "@/server/auth/provisioning";
import { logAuditEvent } from "@/server/audit";

interface ProducerBody {
  id?: string;
  fullName?: string;
  curp?: string;
  status?: "active" | "inactive";
  email?: string;
  password?: string;
}

const PRODUCER_ROLE_KEY = "producer";
const PRODUCER_ROLE_NAME = "Productor";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSlugBase(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return normalized || "producer";
}

function buildSlugCandidates(fullName: string, email: string): string[] {
  const nameBase = toSlugBase(fullName);
  const emailBase = toSlugBase(email.split("@")[0] ?? "producer");
  const now = Date.now().toString(36);

  return [
    `${nameBase}-${now}`,
    `${emailBase}-${now}`,
    `${nameBase}-${Math.random().toString(36).slice(2, 8)}`,
    `${emailBase}-${Math.random().toString(36).slice(2, 8)}`,
  ];
}

async function waitForProfile(userId: string) {
  const supabaseAdmin = getSupabaseProvisioningClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const profileResult = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profileResult.error && profileResult.data) {
      return true;
    }

    await sleep(200);
  }

  return false;
}

async function ensureProducerRole(tenantId: string): Promise<string> {
  const supabaseAdmin = getSupabaseProvisioningClient();

  const roleLookup = await supabaseAdmin
    .from("tenant_roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("key", PRODUCER_ROLE_KEY)
    .maybeSingle();

  if (!roleLookup.error && roleLookup.data) {
    return roleLookup.data.id;
  }

  const roleInsert = await supabaseAdmin
    .from("tenant_roles")
    .insert({
      tenant_id: tenantId,
      key: PRODUCER_ROLE_KEY,
      name: PRODUCER_ROLE_NAME,
      is_system: true,
      priority: 50,
    })
    .select("id")
    .single();

  if (roleInsert.error || !roleInsert.data) {
    throw new Error(roleInsert.error?.message ?? "TENANT_ROLE_CREATE_FAILED");
  }

  const permissionsResult = await supabaseAdmin
    .from("permissions")
    .select("id,key")
    .in("key", [
      "producer.dashboard.read",
      "producer.upp.read",
      "producer.bovinos.read",
      "producer.bovinos.write",
      "producer.movements.read",
      "producer.movements.write",
      "producer.exports.read",
      "producer.exports.write",
      "producer.documents.read",
      "producer.documents.write",
      "producer.employees.read",
      "producer.employees.write",
    ]);

  if (!permissionsResult.error && (permissionsResult.data ?? []).length > 0) {
    const permissionInsert = await supabaseAdmin.from("tenant_role_permissions").insert(
      (permissionsResult.data ?? []).map((permission) => ({
        tenant_role_id: roleInsert.data.id,
        permission_id: permission.id,
      }))
    );

    if (permissionInsert.error) {
      throw new Error(permissionInsert.error.message);
    }
  }

  return roleInsert.data.id;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.read"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  // ── Query params ────────────────────────────────────────────────────────────
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;
  const sortBy = url.searchParams.get("sortBy") ?? "registered_at";
  const sortDir = url.searchParams.get("sortDir") ?? "desc";
  const ascending = sortDir === "asc";
  const dateFrom = url.searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = url.searchParams.get("dateTo")?.trim() ?? "";

  const ALLOWED_SORT_FIELDS: Record<string, string> = {
    registered_at:  "registered_at",
    docs_validated: "docs_validated",
    docs_pending:   "docs_pending",
    docs_issues:    "docs_issues",
  };
  const orderColumn = ALLOWED_SORT_FIELDS[sortBy] ?? "registered_at";

  const supabaseAdmin = getSupabaseProvisioningClient();

  // ── Primary: v_producers_admin view ────────────────────────────────────────
  let viewQuery = supabaseAdmin
    .from("v_producers_admin")
    .select(
      "producer_id,full_name,curp,producer_status,registered_at,docs_validated,docs_pending,docs_issues",
      { count: "exact" }
    )
    .order(orderColumn, { ascending })
    .range(offset, offset + limit - 1);

  if (search) {
    viewQuery = viewQuery.ilike("full_name", `%${search}%`);
  }
  if (status) {
    viewQuery = viewQuery.eq("producer_status", status);
  }
  if (dateFrom) {
    viewQuery = viewQuery.gte("registered_at", dateFrom);
  }
  if (dateTo) {
    viewQuery = viewQuery.lte("registered_at", `${dateTo}T23:59:59`);
  }

  const producersViewResult = await viewQuery;

  if (!producersViewResult.error) {
    const total = producersViewResult.count ?? 0;
    return apiSuccess({
      producers: (producersViewResult.data ?? []).map((row) => ({
        id: row.producer_id,
        full_name: row.full_name,
        curp: row.curp,
        status: row.producer_status,
        created_at: row.registered_at,
        documents: {
          validated: row.docs_validated ?? 0,
          pending: row.docs_pending ?? 0,
          expired: row.docs_issues ?? 0,
        },
      })),
      total,
      page,
      limit,
    });
  }

  // ── Fallback: producers table ───────────────────────────────────────────────
  let fallbackQuery = supabaseAdmin
    .from("producers")
    .select("id,user_id,curp,full_name,status,created_at", { count: "exact" })
    .eq("owner_tenant_id", auth.context.user.tenantId)
    .order("created_at", { ascending })
    .range(offset, offset + limit - 1);

  if (search) {
    fallbackQuery = fallbackQuery.ilike("full_name", `%${search}%`);
  }
  if (status) {
    fallbackQuery = fallbackQuery.eq("status", status);
  }
  if (dateFrom) {
    fallbackQuery = fallbackQuery.gte("created_at", dateFrom);
  }
  if (dateTo) {
    fallbackQuery = fallbackQuery.lte("created_at", `${dateTo}T23:59:59`);
  }

  const fallbackResult = await fallbackQuery;

  if (fallbackResult.error) {
    return apiError(
      "ADMIN_PRODUCERS_QUERY_FAILED",
      fallbackResult.error.message,
      500
    );
  }

  const total = fallbackResult.count ?? 0;
  return apiSuccess({
    producers: (fallbackResult.data ?? []).map((row) => ({
      ...row,
      documents: { validated: 0, pending: 0, expired: 0 },
    })),
    total,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerBody;
  try {
    body = (await request.json()) as ProducerBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const fullName = body.fullName?.trim();
  const curp = body.curp?.trim() || null;

  if (!email || !password || !fullName) {
    return apiError(
      "INVALID_PAYLOAD",
      "Debe enviar email, password y fullName para crear productor."
    );
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const authUserResult = await createAuthUser({
    email,
    password,
    emailConfirmed: true,
  });

  if (authUserResult.error || !authUserResult.data.user) {
    return apiError(
      "ADMIN_PRODUCER_USER_CREATE_FAILED",
      authUserResult.error?.message ?? "No fue posible crear usuario Auth.",
      400
    );
  }

  const createdUserId = authUserResult.data.user.id;
  let createdTenantId: string | null = null;

  try {
    const hasProfile = await waitForProfile(createdUserId);
    if (!hasProfile) {
      throw new Error("PROFILE_NOT_CREATED");
    }

    let tenantId: string | null = null;
    for (const slug of buildSlugCandidates(fullName, email)) {
      const tenantInsert = await supabaseAdmin
        .from("tenants")
        .insert({
          type: "producer",
          slug,
          name: fullName,
          status: "active",
          created_by_user_id: auth.context.user.id,
        })
        .select("id")
        .single();

      if (!tenantInsert.error && tenantInsert.data) {
        tenantId = tenantInsert.data.id;
        break;
      }
    }

    if (!tenantId) {
      throw new Error("TENANT_CREATE_FAILED");
    }

    createdTenantId = tenantId;

    const membershipInsert = await supabaseAdmin
      .from("tenant_memberships")
      .insert({
        tenant_id: tenantId,
        user_id: createdUserId,
        status: "active",
        invited_by_user_id: auth.context.user.id,
      })
      .select("id")
      .single();

    if (membershipInsert.error || !membershipInsert.data) {
      throw new Error(membershipInsert.error?.message ?? "MEMBERSHIP_CREATE_FAILED");
    }

    const producerRoleId = await ensureProducerRole(tenantId);
    const roleAssignment = await supabaseAdmin.from("tenant_user_roles").insert({
      membership_id: membershipInsert.data.id,
      tenant_role_id: producerRoleId,
      assigned_by_user_id: auth.context.user.id,
    });

    if (roleAssignment.error) {
      throw new Error(roleAssignment.error.message);
    }

    const producerInsert = await supabaseAdmin
      .from("producers")
      .insert({
        owner_tenant_id: tenantId,
        user_id: createdUserId,
        curp,
        full_name: fullName,
        status: "active",
      })
      .select("id,user_id,owner_tenant_id,curp,full_name,status,created_at")
      .single();

    if (producerInsert.error || !producerInsert.data) {
      throw new Error(producerInsert.error?.message ?? "PRODUCER_CREATE_FAILED");
    }

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "admin.producers",
      resourceId: producerInsert.data.id,
      payload: {
        email,
        fullName,
        tenantId,
      },
    });

    return apiSuccess(
      {
        producer: producerInsert.data,
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdTenantId) {
      await supabaseAdmin.from("tenants").delete().eq("id", createdTenantId);
    }

    await deleteAuthUser(createdUserId);
    return apiError(
      "ADMIN_PRODUCER_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear productor.",
      400
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerBody;
  try {
    body = (await request.json()) as ProducerBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id del productor.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.fullName?.trim()) {
    updatePayload.full_name = body.fullName.trim();
  }
  if (body.curp !== undefined) {
    updatePayload.curp = body.curp?.trim() || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const updateResult = await supabaseAdmin
    .from("producers")
    .update(updatePayload)
    .eq("id", id)
    .select("id,user_id,owner_tenant_id,curp,full_name,status,created_at")
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_PRODUCER_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("ADMIN_PRODUCER_NOT_FOUND", "No existe productor con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.producers",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ producer: updateResult.data });
}

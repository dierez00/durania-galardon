import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import {
  authEmailsExistBulk,
  createAuthUser,
  deleteAuthUser,
} from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import {
  createMembershipAndAssignRole,
  createTenantWithUniqueSlug,
  ensureTenantRole,
  generateTemporaryPassword,
  waitForProfile,
} from "@/server/admin/provisioning";

interface ProducerBatchRowBody {
  email?: string;
  fullName?: string;
  curp?: string;
}

interface ProducerBatchBody {
  rows?: ProducerBatchRowBody[];
  options?: {
    atomic?: boolean;
  };
}

interface NormalizedProducerRow {
  email: string;
  fullName: string;
  curp: string | null;
}

interface BatchCreatedItem {
  rowIndex: number;
  entityId: string;
  tenantId: string;
  email: string;
  temporaryPassword: string;
}

const MAX_BATCH_ROWS = 100;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

const PRODUCER_PERMISSIONS = [
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
];

class BatchRowError extends Error {
  constructor(
    public readonly rowIndex: number,
    message: string
  ) {
    super(message);
    this.name = "BatchRowError";
  }
}

function normalizeRow(row: ProducerBatchRowBody): NormalizedProducerRow {
  return {
    email: row.email?.trim().toLowerCase() ?? "",
    fullName: row.fullName?.trim() ?? "",
    curp: row.curp?.trim().toUpperCase() || null,
  };
}

function validateRow(row: NormalizedProducerRow, rowIndex: number): void {
  if (!row.email || !EMAIL_REGEX.test(row.email)) {
    throw new BatchRowError(rowIndex, "Email invalido.");
  }
  if (!row.fullName) {
    throw new BatchRowError(rowIndex, "fullName es obligatorio.");
  }
  if (row.curp && !CURP_REGEX.test(row.curp)) {
    throw new BatchRowError(rowIndex, "CURP invalida.");
  }
}

async function validateBatchRows(rows: NormalizedProducerRow[]): Promise<void> {
  const duplicatedEmails = new Set<string>();
  const duplicatedCurps = new Set<string>();
  const emailSeen = new Set<string>();
  const curpSeen = new Set<string>();

  rows.forEach((row) => {
    if (emailSeen.has(row.email)) {
      duplicatedEmails.add(row.email);
    }
    emailSeen.add(row.email);
    if (row.curp) {
      if (curpSeen.has(row.curp)) {
        duplicatedCurps.add(row.curp);
      }
      curpSeen.add(row.curp);
    }
  });

  for (let index = 0; index < rows.length; index += 1) {
    if (duplicatedEmails.has(rows[index].email)) {
      throw new BatchRowError(index, `Email duplicado dentro del lote: ${rows[index].email}`);
    }
    const curp = rows[index].curp;
    if (curp && duplicatedCurps.has(curp)) {
      throw new BatchRowError(index, `CURP duplicada dentro del lote: ${curp}`);
    }
  }

  // ── Emails ya existentes en Auth ─────────────────────────────────────────
  const allEmails = rows.map((row) => row.email);
  const existingAuthEmails = await authEmailsExistBulk(allEmails);
  for (let index = 0; index < rows.length; index += 1) {
    if (existingAuthEmails.has(rows[index].email)) {
      throw new BatchRowError(index, `El email ya esta registrado: ${rows[index].email}`);
    }
  }

  // ── CURPs ya existentes en DB ─────────────────────────────────────────────
  const supabaseAdmin = getSupabaseProvisioningClient();
  const curps = rows.flatMap((row) => (row.curp ? [row.curp] : []));

  const existingCurpsResult =
    curps.length > 0
      ? await supabaseAdmin.from("producers").select("curp").in("curp", curps)
      : { data: [], error: null };
  if (existingCurpsResult.error) {
    throw new Error(existingCurpsResult.error.message);
  }
  const existingCurps = new Set(
    (existingCurpsResult.data ?? [])
      .map((row) => (typeof row.curp === "string" ? row.curp.toUpperCase() : ""))
      .filter(Boolean)
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.curp && existingCurps.has(row.curp)) {
      throw new BatchRowError(index, `La CURP ya existe: ${row.curp}`);
    }
  }
}

async function rollbackRows(
  createdRows: Array<{ producerId: string; tenantId: string; userId: string }>
): Promise<void> {
  const supabaseAdmin = getSupabaseProvisioningClient();
  for (let index = createdRows.length - 1; index >= 0; index -= 1) {
    const created = createdRows[index];
    await supabaseAdmin.from("producers").delete().eq("id", created.producerId);
    await supabaseAdmin.from("tenants").delete().eq("id", created.tenantId);
    await deleteAuthUser(created.userId);
  }
}

async function rollbackPartialRow(state: {
  producerId: string | null;
  tenantId: string | null;
  userId: string | null;
}): Promise<void> {
  const supabaseAdmin = getSupabaseProvisioningClient();
  if (state.producerId) {
    await supabaseAdmin.from("producers").delete().eq("id", state.producerId);
  }
  if (state.tenantId) {
    await supabaseAdmin.from("tenants").delete().eq("id", state.tenantId);
  }
  if (state.userId) {
    await deleteAuthUser(state.userId);
  }
}

async function provisionSingleProducer(
  row: NormalizedProducerRow,
  rowIndex: number,
  createdByUserId: string
): Promise<{
  item: BatchCreatedItem;
  rollback: { producerId: string; tenantId: string; userId: string };
}> {
  const supabaseAdmin = getSupabaseProvisioningClient();
  const rowState: { producerId: string | null; tenantId: string | null; userId: string | null } = {
    producerId: null,
    tenantId: null,
    userId: null,
  };

  try {
    const temporaryPassword = generateTemporaryPassword();
    const authUserResult = await createAuthUser({
      email: row.email,
      password: temporaryPassword,
      emailConfirmed: true,
    });

    if (authUserResult.error || !authUserResult.data.user) {
      throw new BatchRowError(
        rowIndex,
        authUserResult.error?.message ?? "No fue posible crear usuario Auth."
      );
    }

    const userId = authUserResult.data.user.id;
    rowState.userId = userId;

    const profileExists = await waitForProfile(userId);
    if (!profileExists) {
      throw new BatchRowError(rowIndex, "No se pudo confirmar perfil del usuario.");
    }

    const tenant = await createTenantWithUniqueSlug({
      type: "producer",
      fullName: row.fullName,
      email: row.email,
      createdByUserId,
    });
    rowState.tenantId = tenant.tenantId;

    const roleId = await ensureTenantRole({
      tenantId: tenant.tenantId,
      roleKey: "producer",
      roleName: "Productor",
      permissions: PRODUCER_PERMISSIONS,
    });

    await createMembershipAndAssignRole({
      tenantId: tenant.tenantId,
      userId,
      roleId,
      invitedByUserId: createdByUserId,
      assignedByUserId: createdByUserId,
    });

    const producerInsert = await supabaseAdmin
      .from("producers")
      .insert({
        owner_tenant_id: tenant.tenantId,
        user_id: userId,
        curp: row.curp,
        full_name: row.fullName,
        status: "active",
      })
      .select("id")
      .single();

    if (producerInsert.error || !producerInsert.data) {
      throw new BatchRowError(
        rowIndex,
        producerInsert.error?.message ?? "No fue posible crear productor."
      );
    }
    rowState.producerId = producerInsert.data.id;

    return {
      item: {
        rowIndex,
        entityId: producerInsert.data.id,
        tenantId: tenant.tenantId,
        email: row.email,
        temporaryPassword,
      },
      rollback: { producerId: producerInsert.data.id, tenantId: tenant.tenantId, userId },
    };
  } catch (rowError) {
    await rollbackPartialRow(rowState);
    if (rowError instanceof BatchRowError) throw rowError;
    throw new BatchRowError(
      rowIndex,
      rowError instanceof Error ? rowError.message : "No fue posible crear productor."
    );
  }
}

function parseAndValidateBody(body: ProducerBatchBody):
  | { ok: true; rows: ProducerBatchRowBody[] }
  | { ok: false; error: ReturnType<typeof apiError> } {
  if (!body.options?.atomic) {
    return { ok: false, error: apiError("INVALID_PAYLOAD", "options.atomic=true es obligatorio.") };
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return { ok: false, error: apiError("INVALID_PAYLOAD", "Debe enviar al menos una fila en rows.") };
  }
  if (body.rows.length > MAX_BATCH_ROWS) {
    return {
      ok: false,
      error: apiError("INVALID_PAYLOAD", `El maximo por lote es ${MAX_BATCH_ROWS} filas.`),
    };
  }
  return { ok: true, rows: body.rows };
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers.batch",
  });
  if (!auth.ok) return auth.response;

  let body: ProducerBatchBody;
  try {
    body = (await request.json()) as ProducerBatchBody;
  } catch (error_) {
    console.error("[producers/batch] JSON parse error:", error_);
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const parsed = parseAndValidateBody(body);
  if (!parsed.ok) return parsed.error;

  const normalizedRows = parsed.rows.map(normalizeRow);
  try {
    normalizedRows.forEach((row, rowIndex) => validateRow(row, rowIndex));
    await validateBatchRows(normalizedRows);
  } catch (error) {
    if (error instanceof BatchRowError) {
      console.error(`[producers/batch] Validation failed row ${error.rowIndex}:`, error.message);
      return apiError("BATCH_VALIDATION_FAILED", error.message, 400, {
        failedRowIndex: error.rowIndex,
        failedReason: error.message,
        rolledBack: true,
      });
    }
    console.error("[producers/batch] Validation error:", error);
    return apiError(
      "BATCH_VALIDATION_FAILED",
      error instanceof Error ? error.message : "No fue posible validar el lote.",
      400
    );
  }

  const created: BatchCreatedItem[] = [];
  const rollbackStack: Array<{ producerId: string; tenantId: string; userId: string }> = [];

  try {
    for (let rowIndex = 0; rowIndex < normalizedRows.length; rowIndex += 1) {
      const { item, rollback } = await provisionSingleProducer(
        normalizedRows[rowIndex],
        rowIndex,
        auth.context.user.id
      );
      rollbackStack.push(rollback);
      created.push(item);
    }
  } catch (error) {
    await rollbackRows(rollbackStack);
    const failedRowIndex = error instanceof BatchRowError ? error.rowIndex : -1;
    const failedReason = error instanceof Error ? error.message : "No fue posible crear el lote.";
    console.error(`[producers/batch] Creation failed row ${failedRowIndex}:`, failedReason);
    return apiError("ADMIN_PRODUCERS_BATCH_CREATE_FAILED", failedReason, 400, {
      failedRowIndex,
      failedReason,
      rolledBack: true,
    });
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.producers.batch",
    payload: { count: created.length },
  });

  return apiSuccess({ created, count: created.length }, { status: 201 });
}


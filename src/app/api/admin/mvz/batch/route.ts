import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createAuthUser, deleteAuthUser } from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import {
  createMembershipAndAssignRole,
  createTenantWithUniqueSlug,
  ensureTenantRole,
  generateTemporaryPassword,
  waitForProfile,
} from "@/server/admin/provisioning";
import type { AdminMvzRoleKey } from "@/modules/admin/mvz/domain/repositories/adminMvzRepository";

interface MvzBatchRowBody {
  email?: string;
  fullName?: string;
  licenseNumber?: string;
}

interface MvzBatchBody {
  rows?: MvzBatchRowBody[];
  options?: {
    atomic?: boolean;
    roleKey?: AdminMvzRoleKey;
  };
}

interface NormalizedMvzRow {
  email: string;
  fullName: string;
  licenseNumber: string;
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
const MVZ_PERMISSIONS = [
  "mvz.dashboard.read",
  "mvz.assignments.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.exports.read",
  "mvz.exports.write",
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

function normalizeRow(row: MvzBatchRowBody): NormalizedMvzRow {
  return {
    email: row.email?.trim().toLowerCase() ?? "",
    fullName: row.fullName?.trim() ?? "",
    licenseNumber: row.licenseNumber?.trim().toUpperCase() ?? "",
  };
}

function validateRow(row: NormalizedMvzRow, rowIndex: number): void {
  if (!row.email || !EMAIL_REGEX.test(row.email)) {
    throw new BatchRowError(rowIndex, "Email invalido.");
  }
  if (!row.fullName) {
    throw new BatchRowError(rowIndex, "fullName es obligatorio.");
  }
  if (!row.licenseNumber) {
    throw new BatchRowError(rowIndex, "licenseNumber es obligatorio.");
  }
}

async function validateBatchRows(rows: NormalizedMvzRow[]): Promise<void> {
  const duplicatedEmails = new Set<string>();
  const duplicatedLicenses = new Set<string>();
  const emailSeen = new Set<string>();
  const licenseSeen = new Set<string>();

  rows.forEach((row) => {
    if (emailSeen.has(row.email)) duplicatedEmails.add(row.email);
    emailSeen.add(row.email);
    if (licenseSeen.has(row.licenseNumber)) duplicatedLicenses.add(row.licenseNumber);
    licenseSeen.add(row.licenseNumber);
  });

  for (let index = 0; index < rows.length; index += 1) {
    if (duplicatedEmails.has(rows[index].email)) {
      throw new BatchRowError(index, `Email duplicado dentro del lote: ${rows[index].email}`);
    }
    if (duplicatedLicenses.has(rows[index].licenseNumber)) {
      throw new BatchRowError(
        index,
        `Cedula/Licencia duplicada dentro del lote: ${rows[index].licenseNumber}`
      );
    }
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const emails = rows.map((row) => row.email);
  const licenses = rows.map((row) => row.licenseNumber);

  const existingAuthUsersResult = await supabaseAdmin
    .schema("auth")
    .from("users")
    .select("email")
    .in("email", emails);
  if (existingAuthUsersResult.error) {
    throw new Error(existingAuthUsersResult.error.message);
  }
  const existingEmails = new Set(
    (existingAuthUsersResult.data ?? []).map((row) => String(row.email ?? "").toLowerCase())
  );

  const existingLicensesResult = await supabaseAdmin
    .from("mvz_profiles")
    .select("license_number")
    .in("license_number", licenses);
  if (existingLicensesResult.error) {
    throw new Error(existingLicensesResult.error.message);
  }
  const existingLicenses = new Set(
    (existingLicensesResult.data ?? [])
      .map((row) => String(row.license_number ?? "").toUpperCase())
      .filter(Boolean)
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (existingEmails.has(row.email)) {
      throw new BatchRowError(index, `El email ya existe: ${row.email}`);
    }
    if (existingLicenses.has(row.licenseNumber)) {
      throw new BatchRowError(index, `La cedula/licencia ya existe: ${row.licenseNumber}`);
    }
  }
}

async function rollbackRows(
  createdRows: Array<{ mvzProfileId: string; tenantId: string; userId: string }>
): Promise<void> {
  const supabaseAdmin = getSupabaseProvisioningClient();
  for (let index = createdRows.length - 1; index >= 0; index -= 1) {
    const created = createdRows[index];
    await supabaseAdmin.from("mvz_profiles").delete().eq("id", created.mvzProfileId);
    await supabaseAdmin.from("tenants").delete().eq("id", created.tenantId);
    await deleteAuthUser(created.userId);
  }
}

async function rollbackPartialRow(state: {
  mvzProfileId: string | null;
  tenantId: string | null;
  userId: string | null;
}): Promise<void> {
  const supabaseAdmin = getSupabaseProvisioningClient();
  if (state.mvzProfileId) {
    await supabaseAdmin.from("mvz_profiles").delete().eq("id", state.mvzProfileId);
  }
  if (state.tenantId) {
    await supabaseAdmin.from("tenants").delete().eq("id", state.tenantId);
  }
  if (state.userId) {
    await deleteAuthUser(state.userId);
  }
}

function roleNameFor(roleKey: AdminMvzRoleKey): string {
  return roleKey === "mvz_internal" ? "MVZ Interno" : "MVZ Gobierno";
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz.batch",
  });
  if (!auth.ok) return auth.response;

  let body: MvzBatchBody;
  try {
    body = (await request.json()) as MvzBatchBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const roleKey = body.options?.roleKey;
  if (!body.options?.atomic) {
    return apiError("INVALID_PAYLOAD", "options.atomic=true es obligatorio.");
  }
  if (roleKey !== "mvz_government" && roleKey !== "mvz_internal") {
    return apiError("INVALID_PAYLOAD", "options.roleKey debe ser mvz_government o mvz_internal.");
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos una fila en rows.");
  }
  if (body.rows.length > MAX_BATCH_ROWS) {
    return apiError("INVALID_PAYLOAD", `El maximo por lote es ${MAX_BATCH_ROWS} filas.`);
  }

  const normalizedRows = body.rows.map(normalizeRow);
  try {
    normalizedRows.forEach((row, rowIndex) => validateRow(row, rowIndex));
    await validateBatchRows(normalizedRows);
  } catch (error) {
    if (error instanceof BatchRowError) {
      return apiError("BATCH_VALIDATION_FAILED", error.message, 400, {
        failedRowIndex: error.rowIndex,
        failedReason: error.message,
        rolledBack: true,
      });
    }
    return apiError(
      "BATCH_VALIDATION_FAILED",
      error instanceof Error ? error.message : "No fue posible validar el lote.",
      400
    );
  }

  const created: BatchCreatedItem[] = [];
  const rollbackStack: Array<{ mvzProfileId: string; tenantId: string; userId: string }> = [];
  const supabaseAdmin = getSupabaseProvisioningClient();

  try {
    for (let rowIndex = 0; rowIndex < normalizedRows.length; rowIndex += 1) {
      const row = normalizedRows[rowIndex];
      const rowState: { mvzProfileId: string | null; tenantId: string | null; userId: string | null } =
        {
          mvzProfileId: null,
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
          type: "mvz",
          fullName: row.fullName,
          email: row.email,
          createdByUserId: auth.context.user.id,
        });
        rowState.tenantId = tenant.tenantId;

        const roleId = await ensureTenantRole({
          tenantId: tenant.tenantId,
          roleKey,
          roleName: roleNameFor(roleKey),
          permissions: MVZ_PERMISSIONS,
        });

        await createMembershipAndAssignRole({
          tenantId: tenant.tenantId,
          userId,
          roleId,
          invitedByUserId: auth.context.user.id,
          assignedByUserId: auth.context.user.id,
        });

        const mvzInsert = await supabaseAdmin
          .from("mvz_profiles")
          .insert({
            owner_tenant_id: tenant.tenantId,
            user_id: userId,
            full_name: row.fullName,
            license_number: row.licenseNumber,
            status: "active",
          })
          .select("id")
          .single();

        if (mvzInsert.error || !mvzInsert.data) {
          throw new BatchRowError(rowIndex, mvzInsert.error?.message ?? "No fue posible crear MVZ.");
        }
        rowState.mvzProfileId = mvzInsert.data.id;

        rollbackStack.push({
          mvzProfileId: mvzInsert.data.id,
          tenantId: tenant.tenantId,
          userId,
        });
        created.push({
          rowIndex,
          entityId: mvzInsert.data.id,
          tenantId: tenant.tenantId,
          email: row.email,
          temporaryPassword,
        });
      } catch (rowError) {
        await rollbackPartialRow(rowState);
        if (rowError instanceof BatchRowError) {
          throw rowError;
        }
        throw new BatchRowError(
          rowIndex,
          rowError instanceof Error ? rowError.message : "No fue posible crear MVZ."
        );
      }
    }
  } catch (error) {
    await rollbackRows(rollbackStack);
    const failedRowIndex = error instanceof BatchRowError ? error.rowIndex : -1;
    const failedReason = error instanceof Error ? error.message : "No fue posible crear el lote.";
    return apiError("ADMIN_MVZ_BATCH_CREATE_FAILED", failedReason, 400, {
      failedRowIndex,
      failedReason,
      rolledBack: true,
    });
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.mvz.batch",
    payload: {
      count: created.length,
      roleKey,
    },
  });

  return apiSuccess(
    {
      created,
      count: created.length,
    },
    { status: 201 }
  );
}

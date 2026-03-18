import type {
  AdminMvzBatchCreateInput,
  AdminMvzBatchCreateResult,
  AdminMvzRepository,
  AdminMvzRoleKey,
  ListAdminMvzParams,
  ListAdminMvzResult,
} from "@/modules/admin/mvz/domain/repositories/adminMvzRepository";
import { authEmailsExistBulk, createAuthUser, deleteAuthUser } from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import {
  createMembershipAndAssignRole,
  createTenantWithUniqueSlug,
  ensureTenantRole,
  generateTemporaryPassword,
  waitForProfile,
} from "@/server/admin/provisioning";

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

class BatchRowError extends Error {
  constructor(
    public readonly rowIndex: number,
    message: string
  ) {
    super(message);
    this.name = "BatchRowError";
  }
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
] as const;

function normalizeRow(row: { email?: string; fullName?: string; licenseNumber?: string }): NormalizedMvzRow {
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

export class ServerAdminMvzRepository implements AdminMvzRepository {
  constructor(private readonly actingUserId: string) {}

  async list(params: ListAdminMvzParams): Promise<ListAdminMvzResult> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy ?? "registered_at";
    const sortDir = params.sortDir === "asc" ? "asc" : "desc";
    const orderColumn =
      {
        registered_at: "registered_at",
        active_assignments: "active_assignments",
        tests_last_year: "tests_last_year",
      }[sortBy] ?? "registered_at";

    const supabaseAdmin = getSupabaseProvisioningClient();
    let query = supabaseAdmin
      .from("v_mvz_admin")
      .select(
        "mvz_profile_id,user_id,full_name,license_number,mvz_status,active_assignments,tests_last_year,registered_at",
        { count: "exact" }
      );

    if (params.search?.trim()) {
      query = query.ilike("full_name", `%${params.search.trim()}%`);
    }
    if (params.status === "active" || params.status === "inactive") {
      query = query.eq("mvz_status", params.status);
    }
    if (params.dateFrom?.trim()) {
      query = query.gte("registered_at", params.dateFrom.trim());
    }
    if (params.dateTo?.trim()) {
      query = query.lte("registered_at", params.dateTo.trim());
    }

    const rowsResult = await query
      .order(orderColumn, { ascending: sortDir === "asc" })
      .range(offset, offset + limit - 1);

    if (rowsResult.error) {
      throw new Error(rowsResult.error.message);
    }

    return {
      mvzProfiles: (rowsResult.data ?? []).map((row) => ({
        id: row.mvz_profile_id,
        user_id: row.user_id,
        full_name: row.full_name,
        license_number: row.license_number,
        status: row.mvz_status,
        assignedUpps: row.active_assignments ?? 0,
        registeredTests: row.tests_last_year ?? 0,
        created_at: row.registered_at,
      })),
      total: rowsResult.count ?? 0,
      page,
      limit,
    };
  }

  async createBatch(input: AdminMvzBatchCreateInput): Promise<AdminMvzBatchCreateResult> {
    if (!input.options?.atomic) {
      throw new Error("options.atomic=true es obligatorio.");
    }
    if (input.options.roleKey !== "mvz_government" && input.options.roleKey !== "mvz_internal") {
      throw new Error("options.roleKey debe ser mvz_government o mvz_internal.");
    }
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      throw new Error("Debe enviar al menos una fila en rows.");
    }
    if (input.rows.length > MAX_BATCH_ROWS) {
      throw new Error(`El maximo por lote es ${MAX_BATCH_ROWS} filas.`);
    }

    const normalizedRows = input.rows.map(normalizeRow);
    normalizedRows.forEach((row, rowIndex) => validateRow(row, rowIndex));
    await this.validateBatchRows(normalizedRows);

    const created: BatchCreatedItem[] = [];
    const rollbackStack: Array<{ mvzProfileId: string; tenantId: string; userId: string }> = [];

    try {
      for (let rowIndex = 0; rowIndex < normalizedRows.length; rowIndex += 1) {
        const result = await this.provisionSingleMvz(
          normalizedRows[rowIndex],
          rowIndex,
          input.options.roleKey
        );
        rollbackStack.push(result.rollback);
        created.push(result.item);
      }
    } catch (error) {
      await this.rollbackRows(rollbackStack);
      if (error instanceof BatchRowError) {
        throw error;
      }
      throw new Error(error instanceof Error ? error.message : "No fue posible crear el lote.");
    }

    return {
      created,
      count: created.length,
    };
  }

  private async validateBatchRows(rows: NormalizedMvzRow[]): Promise<void> {
    const duplicatedEmails = new Set<string>();
    const duplicatedLicenses = new Set<string>();
    const emailSeen = new Set<string>();
    const licenseSeen = new Set<string>();

    rows.forEach((row) => {
      if (emailSeen.has(row.email)) {
        duplicatedEmails.add(row.email);
      }
      emailSeen.add(row.email);
      if (licenseSeen.has(row.licenseNumber)) {
        duplicatedLicenses.add(row.licenseNumber);
      }
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

    const existingAuthEmails = await authEmailsExistBulk(rows.map((row) => row.email));
    for (let index = 0; index < rows.length; index += 1) {
      if (existingAuthEmails.has(rows[index].email)) {
        throw new BatchRowError(index, `El email ya esta registrado: ${rows[index].email}`);
      }
    }

    const supabaseAdmin = getSupabaseProvisioningClient();
    const licenses = rows.map((row) => row.licenseNumber);
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
      if (existingLicenses.has(rows[index].licenseNumber)) {
        throw new BatchRowError(
          index,
          `La cedula/licencia ya existe: ${rows[index].licenseNumber}`
        );
      }
    }
  }

  private async provisionSingleMvz(
    row: NormalizedMvzRow,
    rowIndex: number,
    roleKey: AdminMvzRoleKey
  ): Promise<{
    item: BatchCreatedItem;
    rollback: { mvzProfileId: string; tenantId: string; userId: string };
  }> {
    const supabaseAdmin = getSupabaseProvisioningClient();
    const rowState: { mvzProfileId: string | null; tenantId: string | null; userId: string | null } = {
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
        createdByUserId: this.actingUserId,
      });
      rowState.tenantId = tenant.tenantId;

      const roleId = await ensureTenantRole({
        tenantId: tenant.tenantId,
        roleKey,
        roleName: roleKey === "mvz_internal" ? "MVZ Interno" : "MVZ Gobierno",
        permissions: [...MVZ_PERMISSIONS],
      });

      await createMembershipAndAssignRole({
        tenantId: tenant.tenantId,
        userId,
        roleId,
        invitedByUserId: this.actingUserId,
        assignedByUserId: this.actingUserId,
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

      return {
        item: {
          rowIndex,
          entityId: mvzInsert.data.id,
          tenantId: tenant.tenantId,
          email: row.email,
          temporaryPassword,
        },
        rollback: {
          mvzProfileId: mvzInsert.data.id,
          tenantId: tenant.tenantId,
          userId,
        },
      };
    } catch (rowError) {
      await this.rollbackPartialRow(rowState);
      if (rowError instanceof BatchRowError) {
        throw rowError;
      }
      throw new BatchRowError(
        rowIndex,
        rowError instanceof Error ? rowError.message : "No fue posible crear MVZ."
      );
    }
  }

  private async rollbackRows(
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

  private async rollbackPartialRow(state: {
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
}

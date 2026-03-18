import type {
  AdminProductorBatchCreateInput,
  AdminProductorBatchCreateResult,
  AdminProductorCreateInput,
  AdminProductoresRepository,
  ListAdminProductoresParams,
  ListAdminProductoresResult,
} from "@/modules/admin/productores/domain/repositories/adminProductoresRepository";
import type { AdminProductor } from "@/modules/admin/productores/domain/entities/AdminProductorEntity";
import {
  authEmailsExistBulk,
  createAuthUser,
  deleteAuthUser,
} from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
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
] as const;

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

function toAdminProductor(record: {
  id: string;
  full_name: string;
  curp: string | null;
  status: string;
  created_at: string;
  user_id?: string | null;
  owner_tenant_id?: string | null;
}): AdminProductor {
  return {
    id: record.id,
    full_name: record.full_name,
    curp: record.curp,
    status: record.status,
    created_at: record.created_at,
    documents: {
      validated: 0,
      pending: 0,
      expired: 0,
    },
    ...(record.user_id ? { user_id: record.user_id } : {}),
    ...(record.owner_tenant_id ? { owner_tenant_id: record.owner_tenant_id } : {}),
  } as AdminProductor;
}

export class ServerAdminProductoresRepository implements AdminProductoresRepository {
  constructor(
    private readonly tenantId: string,
    private readonly actingUserId: string
  ) {}

  async list(params: ListAdminProductoresParams): Promise<ListAdminProductoresResult> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy ?? "registered_at";
    const sortDir = params.sortDir ?? "desc";
    const ascending = sortDir === "asc";
    const orderColumn =
      {
        registered_at: "registered_at",
        docs_validated: "docs_validated",
        docs_pending: "docs_pending",
        docs_issues: "docs_issues",
      }[sortBy] ?? "registered_at";

    const supabaseAdmin = getSupabaseProvisioningClient();
    let viewQuery = supabaseAdmin
      .from("v_producers_admin")
      .select(
        "producer_id,full_name,curp,producer_status,registered_at,docs_validated,docs_pending,docs_issues",
        { count: "exact" }
      )
      .order(orderColumn, { ascending })
      .range(offset, offset + limit - 1);

    if (params.search?.trim()) {
      viewQuery = viewQuery.ilike("full_name", `%${params.search.trim()}%`);
    }
    if (params.status?.trim()) {
      viewQuery = viewQuery.eq("producer_status", params.status.trim());
    }
    if (params.dateFrom?.trim()) {
      viewQuery = viewQuery.gte("registered_at", params.dateFrom.trim());
    }
    if (params.dateTo?.trim()) {
      viewQuery = viewQuery.lte("registered_at", `${params.dateTo.trim()}T23:59:59`);
    }

    const producersViewResult = await viewQuery;

    if (!producersViewResult.error) {
      return {
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
        total: producersViewResult.count ?? 0,
        page,
        limit,
      };
    }

    let fallbackQuery = supabaseAdmin
      .from("producers")
      .select("id,user_id,curp,full_name,status,created_at", { count: "exact" })
      .eq("owner_tenant_id", this.tenantId)
      .order("created_at", { ascending })
      .range(offset, offset + limit - 1);

    if (params.search?.trim()) {
      fallbackQuery = fallbackQuery.ilike("full_name", `%${params.search.trim()}%`);
    }
    if (params.status?.trim()) {
      fallbackQuery = fallbackQuery.eq("status", params.status.trim());
    }
    if (params.dateFrom?.trim()) {
      fallbackQuery = fallbackQuery.gte("created_at", params.dateFrom.trim());
    }
    if (params.dateTo?.trim()) {
      fallbackQuery = fallbackQuery.lte("created_at", `${params.dateTo.trim()}T23:59:59`);
    }

    const fallbackResult = await fallbackQuery;
    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message);
    }

    return {
      producers: (fallbackResult.data ?? []).map((row) =>
        toAdminProductor({
          id: row.id,
          user_id: row.user_id,
          curp: row.curp,
          full_name: row.full_name,
          status: row.status,
          created_at: row.created_at,
        })
      ),
      total: fallbackResult.count ?? 0,
      page,
      limit,
    };
  }

  async create(input: AdminProductorCreateInput): Promise<AdminProductor> {
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim() || generateTemporaryPassword();
    const fullName = input.fullName.trim();
    const curp = input.curp?.trim() || null;

    const supabaseAdmin = getSupabaseProvisioningClient();
    const authUserResult = await createAuthUser({
      email,
      password,
      emailConfirmed: true,
    });

    if (authUserResult.error || !authUserResult.data.user) {
      throw new Error(authUserResult.error?.message ?? "No fue posible crear usuario Auth.");
    }

    const createdUserId = authUserResult.data.user.id;
    let createdTenantId: string | null = null;

    try {
      const hasProfile = await waitForProfile(createdUserId);
      if (!hasProfile) {
        throw new Error("PROFILE_NOT_CREATED");
      }

      const tenant = await createTenantWithUniqueSlug({
        type: "producer",
        fullName,
        email,
        createdByUserId: this.actingUserId,
      });
      createdTenantId = tenant.tenantId;

      const producerRoleId = await ensureTenantRole({
        tenantId: tenant.tenantId,
        roleKey: "producer",
        roleName: "Productor",
        permissions: [...PRODUCER_PERMISSIONS],
      });

      await createMembershipAndAssignRole({
        tenantId: tenant.tenantId,
        userId: createdUserId,
        roleId: producerRoleId,
        invitedByUserId: this.actingUserId,
        assignedByUserId: this.actingUserId,
      });

      const producerInsert = await supabaseAdmin
        .from("producers")
        .insert({
          owner_tenant_id: tenant.tenantId,
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

      return toAdminProductor(producerInsert.data);
    } catch (error) {
      if (createdTenantId) {
        await supabaseAdmin.from("tenants").delete().eq("id", createdTenantId);
      }

      await deleteAuthUser(createdUserId);
      throw error;
    }
  }

  async createBatch(input: AdminProductorBatchCreateInput): Promise<AdminProductorBatchCreateResult> {
    if (!input.options?.atomic) {
      throw new Error("options.atomic=true es obligatorio.");
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
    const rollbackStack: Array<{ producerId: string; tenantId: string; userId: string }> = [];

    try {
      for (let rowIndex = 0; rowIndex < normalizedRows.length; rowIndex += 1) {
        const { item, rollback } = await this.provisionSingleProducer(normalizedRows[rowIndex], rowIndex);
        rollbackStack.push(rollback);
        created.push(item);
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

  private async validateBatchRows(rows: NormalizedProducerRow[]): Promise<void> {
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

    const existingAuthEmails = await authEmailsExistBulk(rows.map((row) => row.email));
    for (let index = 0; index < rows.length; index += 1) {
      if (existingAuthEmails.has(rows[index].email)) {
        throw new BatchRowError(index, `El email ya esta registrado: ${rows[index].email}`);
      }
    }

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
      const curp = rows[index].curp;
      if (curp && existingCurps.has(curp)) {
        throw new BatchRowError(index, `La CURP ya existe: ${curp}`);
      }
    }
  }

  private async provisionSingleProducer(
    row: NormalizedProducerRow,
    rowIndex: number
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
        createdByUserId: this.actingUserId,
      });
      rowState.tenantId = tenant.tenantId;

      const roleId = await ensureTenantRole({
        tenantId: tenant.tenantId,
        roleKey: "producer",
        roleName: "Productor",
        permissions: [...PRODUCER_PERMISSIONS],
      });

      await createMembershipAndAssignRole({
        tenantId: tenant.tenantId,
        userId,
        roleId,
        invitedByUserId: this.actingUserId,
        assignedByUserId: this.actingUserId,
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
      await this.rollbackPartialRow(rowState);
      if (rowError instanceof BatchRowError) {
        throw rowError;
      }
      throw new BatchRowError(
        rowIndex,
        rowError instanceof Error ? rowError.message : "No fue posible crear productor."
      );
    }
  }

  private async rollbackRows(
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

  private async rollbackPartialRow(state: {
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
}

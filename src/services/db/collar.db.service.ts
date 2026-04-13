import { dbPool, query } from "../../config/db";
import { Collar } from "../../types/collar.types";
import { Animal } from "../../types/animal.types";

function createHttpError(message: string, statusCode: number): Error {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

async function ensureProfileExistsTx(client: any, profileId: string, fieldName: string): Promise<void> {
  const result = await client.query(
    `SELECT 1 FROM profiles WHERE id = $1 LIMIT 1`,
    [profileId]
  );

  if ((result.rowCount ?? 0) === 0) {
    throw createHttpError(
      `El valor de ${fieldName} no existe en profiles.id: ${profileId}`,
      400
    );
  }
}

export interface CreateCollarInput {
  collarId: string;
  tenantId?: string | null;
  firmwareVersion?: string | null;
  purchasedAt?: string | null;
}

export async function insertCollar(input: CreateCollarInput): Promise<Collar> {
  const sql = `
    INSERT INTO collars (
      collar_id,
      tenant_id,
      status,
      firmware_version,
      purchased_at
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      collar_id,
      tenant_id,
      animal_id,
      status,
      firmware_version,
      linked_at,
      purchased_at
  `;

  const params = [
    input.collarId,
    input.tenantId ?? null,
    "inactive", // estado inicial por defecto
    input.firmwareVersion ?? null,
    input.purchasedAt ?? null,
  ];

  const { rows } = await query<Collar>(sql, params);
  return rows[0];
}

export async function getCollarById(id: string, tenantId?: string): Promise<Collar | null> {
  const params: any[] = [id];
  const conditions: string[] = ["id = $1"]; // PK

  if (tenantId) {
    params.push(tenantId);
    conditions.push(`tenant_id = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sql = `
    SELECT
      id,
      collar_id,
      tenant_id,
      animal_id,
      status,
      firmware_version,
      linked_at,
      purchased_at
    FROM collars
    ${whereClause}
    LIMIT 1
  `;

  const { rows } = await query<Collar>(sql, params);
  return rows[0] || null;
}

export async function getCollarByCollarId(collarId: string, tenantId?: string): Promise<Collar | null> {
  const params: any[] = [collarId];
  const conditions: string[] = ["collar_id = $1"]; // identificador IoT

  if (tenantId) {
    params.push(tenantId);
    conditions.push(`tenant_id = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sql = `
    SELECT
      id,
      collar_id,
      tenant_id,
      animal_id,
      status,
      firmware_version,
      linked_at,
      purchased_at
    FROM collars
    ${whereClause}
    LIMIT 1
  `;

  const { rows } = await query<Collar>(sql, params);
  return rows[0] || null;
}

export async function getAnimalById(animalId: string, tenantId?: string): Promise<Animal | null> {
  const params: any[] = [animalId];
  const conditions: string[] = ["id = $1"]; // asumiendo PK id

  if (tenantId) {
    params.push(tenantId);
    conditions.push(`tenant_id = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sql = `
    SELECT
      id,
      tenant_id,
      upp_id,
      siniiga_tag,
      sex,
      birth_date,
      status
    FROM animals
    ${whereClause}
    LIMIT 1
  `;

  const { rows } = await query<Animal>(sql, params);
  return rows[0] || null;
}

export async function linkCollarToAnimalTx(params: {
  collarUuid: string;
  animalId: string;
  tenantId: string;
  linkedBy?: string;
}): Promise<void> {
  const { collarUuid, animalId, tenantId, linkedBy } = params;

  if (!dbPool) {
    throw new Error("DB no configurada");
  }

  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const nowIso = new Date().toISOString();

    if (linkedBy) {
      await ensureProfileExistsTx(client, linkedBy, "linkedBy");
    }

    // Actualizar collar
    const updateParams: any[] = [animalId, nowIso, tenantId, collarUuid, tenantId];
    const updateCondition = "WHERE id = $4 AND tenant_id = $5";

    await client.query(
      `UPDATE collars
       SET animal_id = $1,
           linked_at = $2,
           unlinked_at = null,
           tenant_id = $3,
           status = 'linked',
           updated_at = now()
       ${updateCondition}`,
      updateParams
    );

    // Insertar en historial
    const historySql = `
      INSERT INTO collar_animal_history (
        collar_id_fk,
        tenant_id,
        animal_id,
        linked_at,
        linked_by
      ) VALUES ($1, $2, $3, $4, $5)
    `;
    const historyParams = [collarUuid, tenantId, animalId, nowIso, linkedBy ?? null];

    await client.query(historySql, historyParams);

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");

    if (err?.code === "23503" && err?.constraint === "cah_linked_by_fkey") {
      throw createHttpError("linkedBy debe ser un UUID existente en profiles.id", 400);
    }

    throw err;
  } finally {
    client.release();
  }
}

export async function unlinkCollarTx(params: {
  collarUuid: string;
  tenantId: string;
  unlinkedBy?: string;
}): Promise<void> {
  const { collarUuid, tenantId, unlinkedBy } = params;

  if (!dbPool) {
    throw new Error("DB no configurada");
  }

  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const nowIso = new Date().toISOString();

    if (unlinkedBy) {
      await ensureProfileExistsTx(client, unlinkedBy, "unlinkedBy");
    }

    // Obtener animal asociado actual
    const currentSql = `
      SELECT animal_id, linked_at FROM collars
      WHERE id = $1
      AND tenant_id = $2
      LIMIT 1
    `;
    const currentParams = [collarUuid, tenantId];
    const currentRes = await client.query<{ animal_id: string | null; linked_at: string | null }>(
      currentSql,
      currentParams
    );
    const currentAnimalId = currentRes.rows[0]?.animal_id;
    const currentLinkedAt = currentRes.rows[0]?.linked_at;

    if (!currentAnimalId) {
      throw new Error("El collar no tiene animal asociado para desasignar");
    }

    // Actualizar collar
    const updateParams: any[] = [nowIso, collarUuid, tenantId];
    const updateCondition = "WHERE id = $2 AND tenant_id = $3";

    await client.query(
      `UPDATE collars
       SET animal_id = null,
           status = 'unlinked',
           unlinked_at = $1,
           updated_at = now()
       ${updateCondition}`,
      updateParams
    );

    // Cerrar el último historial abierto para ese vínculo collar-animal
    const closeHistorySql = `
      WITH last_open AS (
        SELECT id
        FROM collar_animal_history
        WHERE collar_id_fk = $1
          AND tenant_id = $2
          AND animal_id = $3
          AND unlinked_at IS NULL
        ORDER BY linked_at DESC
        LIMIT 1
      )
      UPDATE collar_animal_history h
      SET unlinked_at = $4,
          unlinked_by = $5
      FROM last_open
      WHERE h.id = last_open.id
    `;
    const closeRes = await client.query(closeHistorySql, [
      collarUuid,
      tenantId,
      currentAnimalId,
      nowIso,
      unlinkedBy ?? null,
    ]);

    // Fallback: si no había historial abierto, insertar un registro consistente
    if ((closeRes.rowCount ?? 0) === 0) {
      const historySql = `
        INSERT INTO collar_animal_history (
          collar_id_fk,
          tenant_id,
          animal_id,
          linked_at,
          unlinked_at,
          unlinked_by,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const historyParams = [
        collarUuid,
        tenantId,
        currentAnimalId,
        currentLinkedAt ?? nowIso,
        nowIso,
        unlinkedBy ?? null,
        "Auto-cierre de historial sin registro abierto previo",
      ];

      await client.query(historySql, historyParams);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");

    if (err?.code === "23503" && err?.constraint === "cah_unlinked_by_fkey") {
      throw createHttpError("unlinkedBy debe ser un UUID existente en profiles.id", 400);
    }

    throw err;
  } finally {
    client.release();
  }
}

export async function updateCollarTenant(
  collarUuid: string,
  tenantId: string | null
): Promise<Collar | null> {
  const sql = `
    UPDATE collars
    SET tenant_id = $2,
        status = CASE
          WHEN $2 IS NULL AND animal_id IS NULL THEN 'inactive'
          WHEN $2 IS NOT NULL AND status = 'inactive' AND animal_id IS NULL THEN 'active'
          ELSE status
        END,
        updated_at = now()
    WHERE id = $1
    RETURNING
      id,
      collar_id,
      tenant_id,
      animal_id,
      status,
      firmware_version,
      linked_at,
      purchased_at
  `;

  const params = [collarUuid, tenantId];
  const { rows } = await query<Collar>(sql, params);
  return rows[0] || null;
}

export async function getCollarsByTenant(
  tenantId: string,
  onlyAssigned: boolean = false
): Promise<Collar[]> {
  const params: any[] = [tenantId];
  let sql = `
    SELECT
      id,
      collar_id,
      tenant_id,
      animal_id,
      status,
      firmware_version,
      linked_at,
      purchased_at
    FROM collars
    WHERE tenant_id = $1
  `;

  if (onlyAssigned) {
    sql += " AND animal_id IS NOT NULL";
  }

  sql += " ORDER BY collar_id ASC";

  const { rows } = await query<Collar>(sql, params);
  return rows;
}

export async function getCollarsByProducerId(
  producerId: string,
  tenantId?: string
): Promise<Collar[]> {
  const params: any[] = [producerId];

  let sql = `
    SELECT
      c.id,
      c.collar_id,
      c.tenant_id,
      c.animal_id,
      c.status,
      c.firmware_version,
      c.linked_at,
      c.purchased_at
    FROM collars c
    JOIN animals a ON c.animal_id = a.id
    JOIN upps u ON a.upp_id = u.id
    WHERE u.producer_id = $1
  `;

  if (tenantId) {
    params.push(tenantId);
    sql += ` AND c.tenant_id = $${params.length}`;
  }

  sql += " ORDER BY c.collar_id ASC";

  const { rows } = await query<Collar>(sql, params);
  return rows;
}

export async function getCollarsByUppId(
  uppId: string,
  tenantId?: string
): Promise<Collar[]> {
  const params: any[] = [uppId];

  let sql = `
    SELECT
      c.id,
      c.collar_id,
      c.tenant_id,
      c.animal_id,
      c.status,
      c.firmware_version,
      c.linked_at,
      c.purchased_at
    FROM collars c
    JOIN animals a ON c.animal_id = a.id
    WHERE a.upp_id = $1
  `;

  if (tenantId) {
    params.push(tenantId);
    sql += ` AND c.tenant_id = $${params.length}`;
  }

  sql += " ORDER BY c.collar_id ASC";

  const { rows } = await query<Collar>(sql, params);
  return rows;
}

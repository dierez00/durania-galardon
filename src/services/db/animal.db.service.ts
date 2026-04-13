import { query } from "../../config/db";
import { Animal } from "../../types/animal.types";

export async function getAnimalsByTenant(tenantId: string): Promise<Animal[]> {
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
    WHERE tenant_id = $1
    ORDER BY siniiga_tag ASC
  `;

  const { rows } = await query<Animal>(sql, [tenantId]);
  return rows;
}

export async function getAnimalById(
  animalId: string,
  tenantId?: string
): Promise<Animal | null> {
  const params: any[] = [animalId];
  const conditions: string[] = ["id = $1"];

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

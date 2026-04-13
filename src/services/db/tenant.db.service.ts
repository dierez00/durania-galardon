import { query } from "../../config/db";
import { Tenant } from "../../types/tenant.types";

export async function getAllTenants(): Promise<Tenant[]> {
  const sql = `
    SELECT
      id,
      type,
      slug,
      name,
      status,
      created_by_user_id,
      created_at
    FROM tenants
    WHERE status = 'active'
    ORDER BY name ASC
  `;

  const { rows } = await query<Tenant>(sql, []);
  return rows;
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const sql = `
    SELECT
      id,
      type,
      slug,
      name,
      status,
      created_by_user_id,
      created_at
    FROM tenants
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await query<Tenant>(sql, [tenantId]);
  return rows[0] || null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const sql = `
    SELECT
      id,
      type,
      slug,
      name,
      status,
      created_by_user_id,
      created_at
    FROM tenants
    WHERE slug = $1
    LIMIT 1
  `;

  const { rows } = await query<Tenant>(sql, [slug]);
  return rows[0] || null;
}

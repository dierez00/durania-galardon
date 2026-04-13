import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_DIRECT;

if (!connectionString) {
  // No lanzamos error en import para no romper el servidor en dev sin DB,
  // pero logueamos advertencia.
  console.warn("[DB] DATABASE_URL/DATABASE_URL_DIRECT no está configurado. La capa de BD no podrá conectarse.");
}

export const dbPool = connectionString
  ? new Pool({ connectionString })
  : (null as unknown as Pool);

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  if (!dbPool) {
    throw new Error("DB no configurada: falta DATABASE_URL o DATABASE_URL_DIRECT");
  }
  const result = await dbPool.query(text, params);
  return { rows: result.rows as T[] };
}

export default dbPool;

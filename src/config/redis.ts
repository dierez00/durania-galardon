import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

dotenv.config();

let client: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
  if (client) return client;

  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn("[Redis] REDIS_URL no está configurada. Redis no estará disponible.");
    // Creamos un cliente dummy que lanza errores al usar comandos.
    throw new Error("REDIS_URL no configurada");
  }

  client = createClient({ url });

  client.on("error", (err) => {
    console.error("[Redis] Error en cliente Redis:", err);
  });

  client.connect().catch((err) => {
    console.error("[Redis] Error al conectar:", err);
  });

  return client;
}

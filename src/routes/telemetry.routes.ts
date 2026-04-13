import { Router } from "express";
import {
  getHistoricalByCollar,
  getHistoricalByUpp,
  getRealtimeByCollar,
  streamRealtimeByCollar,
  getHighFreqRealtimeFromRedis,
  getUppRealtimeFromRedis,
  postTelemetry,
  getProducerCollarsTelemetry,
  streamUppCollarsFromRedis,
  getTenantCollarsTelemetry,
} from "../controllers/telemetry.controller";

const router = Router();

// Ingesta de telemetría desde collares o gateway
router.post("/telemetry", postTelemetry);

// Tiempo real (Redis + fallback a última medición)
router.get("/collars/:collarId/realtime", getRealtimeByCollar);
router.get("/collars/:collarId/realtime/stream", streamRealtimeByCollar);

// Tiempo real directo desde Redis (clave cow:{collarId})
router.get("/collars/:collarId/redis/realtime", getHighFreqRealtimeFromRedis);

// Tiempo real Redis por rancho UPP (todos los collares del UPP)
router.get("/upps/:uppId/collars/redis/realtime", getUppRealtimeFromRedis);

// Histórico del collar
router.get("/collars/:collarId/history", getHistoricalByCollar);

// Histórico de telemetría por rancho UPP
router.get("/upps/:uppId/collars/history", getHistoricalByUpp);

// Telemetría de todos los collares de un productor (última medición por collar, Postgres)
router.get("/producers/:producerId/collars/telemetry", getProducerCollarsTelemetry);

// Stream SSE: telemetría desde Redis de todos los collares asignados a un rancho UPP
router.get("/upps/:uppId/collars/realtime/stream", streamUppCollarsFromRedis);

// Telemetría de todos los collares de un tenant (última medición por collar, Postgres)
router.get("/tenants/:tenantId/collars/telemetry", getTenantCollarsTelemetry);

export default router;

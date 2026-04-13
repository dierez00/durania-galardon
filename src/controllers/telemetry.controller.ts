import { Request, Response, NextFunction } from "express";
import {
  getHistoricalTelemetryByCollar,
  getHistoricalTelemetryByUpp,
  getRealtimeTelemetryByCollar,
  getHighFreqTelemetryFromRedis,
  processIncomingTelemetry,
  getLatestTelemetryForProducerCollars,
  getUppRealtimeSnapshotFromRedis,
  getLatestTelemetryForTenantCollars,
} from "../services/telemetry.service";
import { ensureString, optionalNumber } from "../utils/validation";

function getQueryParamString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return undefined;
}

export async function postTelemetry(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body || {};

    const collarId = ensureString(body.collarId ?? body.collar_id, "collarId");

    await processIncomingTelemetry({
      collarId,
      tenantId: body.tenantId ?? body.tenant_id ?? null,
      animalId: body.animalId ?? body.animal_id ?? null,
      latitude: body.latitude != null ? Number(body.latitude) : null,
      longitude: body.longitude != null ? Number(body.longitude) : null,
      altitude: body.altitude != null ? Number(body.altitude) : null,
      speed: body.speed != null ? Number(body.speed) : null,
      temperature: body.temperature != null ? Number(body.temperature) : null,
      activity: body.activity ?? null,
      batVoltage: body.batVoltage ?? body.bat_voltage ?? null,
      batPercent: body.batPercent ?? body.bat_percent ?? null,
      accelX: body.accelX ?? body.accel_x ?? null,
      accelY: body.accelY ?? body.accel_y ?? null,
      accelZ: body.accelZ ?? body.accel_z ?? null,
      gyroX: body.gyroX ?? body.gyro_x ?? null,
      gyroY: body.gyroY ?? body.gyro_y ?? null,
      gyroZ: body.gyroZ ?? body.gyro_z ?? null,
      rssi: body.rssi ?? null,
      snr: body.snr ?? null,
      timestamp: body.timestamp,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getRealtimeByCollar(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (UUID)");
    const tenantId = getQueryParamString(req.query.tenantId);

    const snapshot = await getRealtimeTelemetryByCollar(collarId, tenantId);

    if (!snapshot) {
      return res.status(404).json({
        error: true,
        message: "No hay datos de telemetría para este collar",
      });
    }

    res.json(snapshot);
  } catch (err) {
    next(err);
  }
}

export async function getHistoricalByCollar(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (UUID)");
    const tenantId = getQueryParamString(req.query.tenantId);

    const from = getQueryParamString(req.query.from);
    const to = getQueryParamString(req.query.to);
    const limit = optionalNumber(req.query.limit);
    const page = optionalNumber(req.query.page);

    const result = await getHistoricalTelemetryByCollar(
      collarId,
      {
        from,
        to,
        limit,
        page,
      },
      tenantId
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Tiempo real directo desde Redis (pipeline IoT), indexado por collar_id (ej: cow:COLLAR-001)
export async function getHighFreqRealtimeFromRedis(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (IoT)");

    const data = await getHighFreqTelemetryFromRedis(collarId);

    if (data == null) {
      return res.status(404).json({
        error: true,
        message: "No hay datos de telemetría en Redis para este collar_id",
      });
    }

    res.json({
      collarId,
      source: "redis:cow",
      data,
    });
  } catch (err) {
    next(err);
  }
}

// Server-Sent Events: stream de telemetría en tiempo real
export async function streamRealtimeByCollar(req: Request, res: Response, next: NextFunction) {
  try {
    const collarId = ensureString(req.params.collarId, "collarId (IoT)");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Enviar primer snapshot inmediato SOLO desde Redis (hash cow:{collarId}, si existe)
    const initial: any = await getHighFreqTelemetryFromRedis(collarId);
    let lastTimestamp: string | undefined = undefined;

    if (initial) {
      lastTimestamp = initial.timestamp ? String(initial.timestamp) : undefined;
      res.write(
        `data: ${JSON.stringify({
          collarId,
          source: "redis:cow",
          data: initial,
        })}\n\n`
      );
    }

    const interval = setInterval(async () => {
      try {
        // Consultar únicamente Redis usando collar_id (hash cow:{collarId})
        const current: any = await getHighFreqTelemetryFromRedis(collarId);
        if (!current) return;

        const currentTs = current.timestamp ? String(current.timestamp) : undefined;

        if (!currentTs || currentTs !== lastTimestamp) {
          lastTimestamp = currentTs;
          res.write(
            `data: ${JSON.stringify({
              collarId,
              source: "redis:cow",
              data: current,
            })}\n\n`
          );
        }
      } catch (err) {
        console.error("[SSE] Error obteniendo telemetría:", err);
      }
    }, 30000); // cada 30 segundos

    req.on("close", () => {
      clearInterval(interval);
    });
  } catch (err) {
    next(err);
  }
}

// Telemetría de todos los collares asociados a un productor (último dato por collar, desde Postgres)
export async function getProducerCollarsTelemetry(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const producerId = ensureString(req.params.producerId, "producerId");
    const tenantId = getQueryParamString(req.query.tenantId);

    const result = await getLatestTelemetryForProducerCollars(producerId, tenantId);

    res.json({
      producerId,
      tenantId: tenantId ?? null,
      count: result.length,
      items: result,
    });
  } catch (err) {
    next(err);
  }
}

// Snapshot en tiempo real (Redis) de todos los collares de un rancho UPP
export async function getUppRealtimeFromRedis(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const uppId = ensureString(req.params.uppId, "uppId");
    const tenantId = getQueryParamString(req.query.tenantId);

    const snapshot = await getUppRealtimeSnapshotFromRedis(uppId, tenantId);

    res.json(snapshot);
  } catch (err) {
    next(err);
  }
}

// Stream SSE con la telemetría en Redis de todos los collares asignados a un rancho UPP
export async function streamUppCollarsFromRedis(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const uppId = ensureString(req.params.uppId, "uppId");
    const tenantId = getQueryParamString(req.query.tenantId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendSnapshot = async () => {
      const snapshot = await getUppRealtimeSnapshotFromRedis(uppId, tenantId);
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    };

    // Primer envío inmediato
    await sendSnapshot();

    const interval = setInterval(async () => {
      try {
        await sendSnapshot();
      } catch (err) {
        console.error("[SSE upp] Error obteniendo snapshot de Redis:", err);
      }
    }, 30000); // cada 30 segundos

    req.on("close", () => {
      clearInterval(interval);
    });
  } catch (err) {
    next(err);
  }
}

// Histórico Postgres de telemetría para todos los collares de un rancho UPP
export async function getHistoricalByUpp(req: Request, res: Response, next: NextFunction) {
  try {
    const uppId = ensureString(req.params.uppId, "uppId");
    const tenantId = getQueryParamString(req.query.tenantId);

    const from = getQueryParamString(req.query.from);
    const to = getQueryParamString(req.query.to);
    const limit = optionalNumber(req.query.limit);
    const page = optionalNumber(req.query.page);

    const result = await getHistoricalTelemetryByUpp(
      uppId,
      {
        from,
        to,
        limit,
        page,
      },
      tenantId
    );

    res.json({
      uppId,
      tenantId: tenantId ?? null,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

// Telemetría de todos los collares de un tenant (última medición por collar, Postgres)
export async function getTenantCollarsTelemetry(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = ensureString(req.params.tenantId, "tenantId");

    const result = await getLatestTelemetryForTenantCollars(tenantId);

    res.json({
      tenantId,
      count: result.length,
      items: result,
    });
  } catch (err) {
    next(err);
  }
}

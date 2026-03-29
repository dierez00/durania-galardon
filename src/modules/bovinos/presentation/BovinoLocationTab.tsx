"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import {
  apiFetchProducerCollarIotHistory,
  apiOpenProducerUppRealtimeStream,
} from "@/modules/collars/infra/api/collaresApi";
import { DetailEmptyState } from "@/shared/ui/detail/DetailEmptyState";

interface ProducerAnimalMapPoint {
  id: string;
  uppId: string;
  lat: number;
  lng: number;
  siniigaTag: string;
  name: string | null;
  healthStatus: string | null;
  collarId: string | null;
  timestamp: string | null;
  batteryPercent: number | null;
}

interface LeafletMapProps {
  points: ProducerAnimalMapPoint[];
  onMarkerClick: (animalId: string) => void;
}

const LeafletMap = dynamic<LeafletMapProps>(
  () =>
    import("./ProducerBovinosLeafletMap").then(
      (mod) => mod.default as ComponentType<LeafletMapProps>
    ),
  { ssr: false }
);

interface TelemetryPoint {
  lat: number;
  lng: number;
  timestamp: string | null;
  batteryPercent: number | null;
}

interface BovinoLocationTabProps {
  bovino: Bovino;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeBatteryPercent(value: number | null): number | null {
  if (value === null) return null;
  const percent = value <= 1 ? value * 100 : value;
  const clamped = Math.min(100, Math.max(0, percent));
  return Number.isFinite(clamped) ? Math.round(clamped) : null;
}

function extractTimestamp(record: Record<string, unknown>): string | null {
  const candidates = [
    record.timestamp,
    record.updated_at,
    record.updatedAt,
    record.last_seen,
    record.lastSeen,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function extractBatteryPercent(record: Record<string, unknown>): number | null {
  const directCandidates = [
    record.battery,
    record.battery_percent,
    record.batteryPercentage,
    record.battery_level,
    record.batteryLevel,
    record.batt,
  ];

  for (const candidate of directCandidates) {
    const parsed = toFiniteNumber(candidate);
    const normalized = normalizeBatteryPercent(parsed);
    if (normalized !== null) {
      return normalized;
    }
  }

  const batteryObject = asRecord(record.battery_info ?? record.batteryInfo ?? record.battery_data ?? record.batteryData);
  if (batteryObject) {
    const nestedCandidates = [
      batteryObject.percent,
      batteryObject.percentage,
      batteryObject.value,
      batteryObject.level,
      batteryObject.battery,
    ];

    for (const candidate of nestedCandidates) {
      const parsed = toFiniteNumber(candidate);
      const normalized = normalizeBatteryPercent(parsed);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return null;
}

function extractCoordinates(record: Record<string, unknown>): TelemetryPoint | null {
  const directLat = toFiniteNumber(record.lat ?? record.latitude ?? record.location_lat ?? record.locationLat);
  const directLng = toFiniteNumber(
    record.lng ?? record.lon ?? record.longitude ?? record.location_lng ?? record.locationLng
  );

  if (directLat !== null && directLng !== null) {
    if (directLat === 0 && directLng === 0) {
      return null;
    }

    return {
      lat: directLat,
      lng: directLng,
      timestamp: extractTimestamp(record),
      batteryPercent: extractBatteryPercent(record),
    };
  }

  const nestedKeys = ["location", "position", "coords", "coordinates", "gps", "last_location", "lastLocation"];
  for (const nestedKey of nestedKeys) {
    const nested = asRecord(record[nestedKey]);
    if (!nested) continue;

    const lat = toFiniteNumber(nested.lat ?? nested.latitude ?? nested.location_lat ?? nested.locationLat);
    const lng = toFiniteNumber(
      nested.lng ?? nested.lon ?? nested.longitude ?? nested.location_lng ?? nested.locationLng
    );
    if (lat !== null && lng !== null) {
      if (lat === 0 && lng === 0) {
        continue;
      }

      return {
        lat,
        lng,
        timestamp: extractTimestamp(nested) ?? extractTimestamp(record),
        batteryPercent: extractBatteryPercent(nested) ?? extractBatteryPercent(record),
      };
    }
  }

  return null;
}

function collectTelemetryEntries(payload: unknown): Array<Record<string, unknown>> {
  const queue: unknown[] = [payload];
  const found: Array<Record<string, unknown>> = [];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    const record = asRecord(current);
    if (!record) {
      continue;
    }

    if (extractCoordinates(record)) {
      found.push(record);
    }

    Object.values(record).forEach((value) => {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    });
  }

  return found;
}

export function BovinoLocationTab({ bovino }: Readonly<BovinoLocationTabProps>) {
  const [point, setPoint] = useState<ProducerAnimalMapPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<"idle" | "connecting" | "live" | "fallback">("idle");

  const collarIdentifier = useMemo(
    () => bovino.current_collar_uuid ?? bovino.current_collar_id ?? null,
    [bovino.current_collar_id, bovino.current_collar_uuid]
  );

  useEffect(() => {
    if (!collarIdentifier) {
      setPoint(null);
      setError(null);
      setStreamStatus("idle");
      return;
    }

    let isActive = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        reconnectTimer = setTimeout(resolve, ms);
      });

    const upsertPoint = (location: TelemetryPoint) => {
      setPoint((current) => ({
        id: current?.id ?? bovino.id,
        uppId: current?.uppId ?? bovino.upp_id,
        lat: location.lat,
        lng: location.lng,
        siniigaTag: current?.siniigaTag ?? bovino.siniiga_tag,
        name: current?.name ?? bovino.name,
        healthStatus: current?.healthStatus ?? bovino.health_status,
        collarId: current?.collarId ?? bovino.current_collar_id,
        timestamp: location.timestamp,
        batteryPercent: location.batteryPercent,
      }));
    };

    const targetCollarKeys = new Set(
      [bovino.current_collar_uuid, bovino.current_collar_id, collarIdentifier]
        .map((value) => normalizeKey(value ?? undefined))
        .filter((value): value is string => Boolean(value))
    );

    const pickLatestLocation = (payload: unknown): TelemetryPoint | null => {
      const entries = collectTelemetryEntries(payload)
        .map((entry, index) => ({
          collarKeys: extractCollarKeys(entry),
          location: extractCoordinates(entry),
          index,
        }))
        .filter(
          (entry): entry is { collarKeys: string[]; location: TelemetryPoint; index: number } =>
            Boolean(entry.location) && entry.collarKeys.some((key) => targetCollarKeys.has(key))
        )
        .sort((a, b) => {
          const at = a.location.timestamp ? new Date(a.location.timestamp).getTime() : Number.NaN;
          const bt = b.location.timestamp ? new Date(b.location.timestamp).getTime() : Number.NaN;

          if (Number.isFinite(at) && Number.isFinite(bt)) {
            return at - bt;
          }
          if (Number.isFinite(at)) return 1;
          if (Number.isFinite(bt)) return -1;
          return a.index - b.index;
        });

      return entries.length > 0 ? entries[entries.length - 1].location : null;
    };

    const loadLatestLocation = async (silent: boolean = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const payload = await apiFetchProducerCollarIotHistory(collarIdentifier, { page: 1, limit: 1 });
        if (!isActive) return;

        const location = pickLatestLocation(payload);

        if (!location) {
          setPoint(null);
          return;
        }

        upsertPoint(location);
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "No fue posible cargar ubicacion del bovino.");
        }
      } finally {
        if (isActive && !silent) {
          setLoading(false);
        }
      }
    };

    const consumeSseStream = async (response: Response): Promise<void> => {
      if (!response.body) {
        throw new Error("Stream sin body.");
      }

      const decoder = new TextDecoder();
      streamReader = response.body.getReader();
      let buffer = "";

      while (isActive) {
        const { value, done } = await streamReader.read();
        if (done) {
          throw new Error("Stream finalizado por el servidor.");
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

        let boundaryIndex = buffer.indexOf("\n\n");
        while (boundaryIndex >= 0) {
          const block = buffer.slice(0, boundaryIndex).trim();
          buffer = buffer.slice(boundaryIndex + 2);

          const dataLines = block
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""));

          if (dataLines.length > 0) {
            const rawData = dataLines.join("\n");
            let payload: unknown = rawData;
            try {
              payload = JSON.parse(rawData);
            } catch {
              // si no es JSON, se ignora parseo y se intenta con raw
            }

            const location = pickLatestLocation(payload);
            if (location) {
              upsertPoint(location);
              setError(null);
              setStreamStatus("live");
            }
          }

          boundaryIndex = buffer.indexOf("\n\n");
        }
      }
    };

    const startRealtimeStream = async () => {
      let attempts = 0;
      while (isActive) {
        try {
          setStreamStatus("connecting");
          const response = await apiOpenProducerUppRealtimeStream(bovino.upp_id);
          if (!isActive) return;

          attempts = 0;
          setStreamStatus("live");
          await consumeSseStream(response);
        } catch {
          if (!isActive) {
            return;
          }

          setStreamStatus("fallback");
          await loadLatestLocation(true);

          attempts += 1;
          const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts, 5));
          await wait(delay);
        }
      }
    };

    void (async () => {
      await loadLatestLocation();
      if (isActive) {
        void startRealtimeStream();
      }
    })();

    return () => {
      isActive = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (streamReader) {
        void streamReader.cancel();
      }
    };
  }, [bovino.current_collar_id, bovino.current_collar_uuid, bovino.id, bovino.health_status, bovino.name, bovino.siniiga_tag, bovino.upp_id, collarIdentifier]);

  if (!collarIdentifier) {
    return (
      <DetailEmptyState
        icon={MapPin}
        message="Este bovino no tiene collar asignado"
        description="Asigna un collar para habilitar el mapa de ubicacion individual."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando ubicacion del bovino...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!point) {
    return (
      <DetailEmptyState
        icon={MapPin}
        message="Sin coordenadas disponibles"
        description="No existe telemetria reciente para este collar en el historial IoT."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Ubicacion actual del bovino</h3>
        <span className="text-xs text-muted-foreground">
          {streamStatus === "live"
            ? "Tiempo real"
            : streamStatus === "connecting"
              ? "Conectando stream..."
              : streamStatus === "fallback"
                ? "Modo respaldo"
                : "Sin stream"}
        </span>
      </div>
      <div className="h-96 w-full transition-[height] duration-300 ease-out hover:h-[34rem]">
        <LeafletMap points={[point]} onMarkerClick={() => undefined} />
      </div>
    </div>
  );
}

function extractCollarKeys(record: Record<string, unknown>): string[] {
  const keys = new Set<string>();

  const directCandidates = [
    record.collar_id,
    record.collarId,
    record.collar_uuid,
    record.collarUuid,
    record.device_id,
    record.deviceId,
  ];

  for (const value of directCandidates) {
    const normalized = normalizeKey(typeof value === "string" ? value : undefined);
    if (normalized) keys.add(normalized);
  }

  const collarObject = asRecord(record.collar);
  if (collarObject) {
    const fromCollar = [
      collarObject.id,
      collarObject.collar_id,
      collarObject.collarId,
      collarObject.uuid,
    ];

    for (const value of fromCollar) {
      const normalized = normalizeKey(typeof value === "string" ? value : undefined);
      if (normalized) keys.add(normalized);
    }
  }

  return Array.from(keys);
}
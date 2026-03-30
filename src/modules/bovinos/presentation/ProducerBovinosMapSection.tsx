"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchBovinos } from "@/modules/bovinos/infra/api/bovinosApi";
import {
  apiFetchProducerCollars,
  apiFetchProducerUppRealtimeSnapshot,
} from "@/modules/collars/infra/api/collaresApi";
import { buildProjectHref } from "@/modules/workspace/presentation/workspace-routing";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import type { ProducerAnimalMapPoint } from "./ProducerBovinosLeafletMap";

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

interface ProducerBovinoLite {
  id: string;
  upp_id: string;
  siniiga_tag: string;
  name: string | null;
  health_status: string | null;
  current_collar_uuid: string | null;
  current_collar_id: string | null;
}

interface ProducerCollarLite {
  id: string;
  collar_id: string;
  animal_id: string | null;
}

interface TelemetryPoint {
  lat: number;
  lng: number;
  timestamp: string | null;
  batteryPercent: number | null;
}

interface ProducerBovinosMapSectionProps {
  selectedUppId?: string | null;
  selectedUppName?: string | null;
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

function normalizeBatteryPercent(value: number | null): number | null {
  if (value === null) return null;
  const percent = value <= 1 ? value * 100 : value;
  const clamped = Math.min(100, Math.max(0, percent));
  return Number.isFinite(clamped) ? Math.round(clamped) : null;
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

    const coordinates = extractCoordinates(record);
    const collarKeys = extractCollarKeys(record);
    if (coordinates && collarKeys.length > 0) {
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

function buildTelemetryIndex(payload: unknown): Map<string, TelemetryPoint> {
  const telemetry = new Map<string, TelemetryPoint>();
  const entries = collectTelemetryEntries(payload);

  entries.forEach((entry) => {
    const coords = extractCoordinates(entry);
    if (!coords) return;

    const collarKeys = extractCollarKeys(entry);
    collarKeys.forEach((key) => {
      telemetry.set(key, coords);
    });
  });

  return telemetry;
}

export function ProducerBovinosMapSection({
  selectedUppId,
  selectedUppName,
}: Readonly<ProducerBovinosMapSectionProps>) {
  const router = useRouter();
  const [points, setPoints] = useState<ProducerAnimalMapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedUppId) {
      setPoints([]);
      setError(null);
      return;
    }

    let isActive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [bovinosResult, collarsResult, snapshot] = await Promise.all([
          apiFetchBovinos(selectedUppId),
          apiFetchProducerCollars(selectedUppId),
          apiFetchProducerUppRealtimeSnapshot(selectedUppId),
        ]);

        if (!isActive) return;

        const bovinos = (bovinosResult as ProducerBovinoLite[]).filter(
          (animal) => animal.upp_id === selectedUppId
        );
        const collars = collarsResult as ProducerCollarLite[];
        const telemetry = buildTelemetryIndex(snapshot);

        const collarsByAnimal = new Map<string, ProducerCollarLite>();
        collars.forEach((collar) => {
          if (collar.animal_id) {
            collarsByAnimal.set(collar.animal_id, collar);
          }
        });

        const mappedPoints: ProducerAnimalMapPoint[] = [];

        bovinos.forEach((animal) => {
          const linkedCollar = collarsByAnimal.get(animal.id);
          const candidates = [
            animal.current_collar_uuid,
            animal.current_collar_id,
            linkedCollar?.id,
            linkedCollar?.collar_id,
          ]
            .map((value) => normalizeKey(value ?? undefined))
            .filter((value): value is string => Boolean(value));

          const telemetryPoint = candidates
            .map((candidate) => telemetry.get(candidate))
            .find((value): value is TelemetryPoint => Boolean(value));

          if (!telemetryPoint) {
            return;
          }

          mappedPoints.push({
            id: animal.id,
            uppId: animal.upp_id,
            lat: telemetryPoint.lat,
            lng: telemetryPoint.lng,
            siniigaTag: animal.siniiga_tag,
            name: animal.name,
            healthStatus: animal.health_status,
            collarId: linkedCollar?.collar_id ?? animal.current_collar_id ?? null,
            timestamp: telemetryPoint.timestamp,
            batteryPercent: telemetryPoint.batteryPercent,
          });
        });

        setPoints(mappedPoints);
      } catch (err) {
        if (isActive) {
          setPoints([]);
          setError(err instanceof Error ? err.message : "No fue posible cargar mapa de ubicacion.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [selectedUppId]);

  const title = useMemo(
    () =>
      selectedUppName
        ? `Ubicacion en tiempo real - ${selectedUppName}`
        : "Ubicacion en tiempo real",
    [selectedUppName]
  );

  if (!selectedUppId) {
    return (
      <Alert>
        <AlertTitle>Selecciona una UPP</AlertTitle>
        <AlertDescription>
          Para visualizar el mapa de ubicacion, primero selecciona un rancho (UPP).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {loading ? <span className="animate-pulse text-xs text-muted-foreground">Actualizando...</span> : null}
      </div>

      {error ? (
        <p className="px-4 py-6 text-sm text-destructive">{error}</p>
      ) : points.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No hay ubicaciones IoT disponibles para animales de esta UPP.
        </p>
      ) : (
        <div className="h-80 w-full transition-[height] duration-300 ease-out hover:h-[30rem]">
          <LeafletMap
            points={points}
            onMarkerClick={(animalId) =>
              router.push(`${buildProjectHref("producer", selectedUppId, "animales")}/${animalId}?tab=ubicacion`)
            }
          />
        </div>
      )}
    </div>
  );
}
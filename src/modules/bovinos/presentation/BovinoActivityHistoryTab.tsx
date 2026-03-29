"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { Activity, Loader2, MapPin } from "lucide-react";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import { apiFetchProducerCollarIotHistory } from "@/modules/collars/infra/api/collaresApi";
import { DetailEmptyState } from "@/shared/ui/detail/DetailEmptyState";
import {
  DateRangeFilter,
  FiltersContainer,
  FiltersLayout,
  FiltersRow,
  TimeRangeFilter,
} from "@/shared/ui/filters";
import type { BovinoActivityPoint } from "./BovinoActivityHistoryLeafletMap";

interface LeafletMapProps {
  points: BovinoActivityPoint[];
}

const LeafletMap = dynamic<LeafletMapProps>(
  () =>
    import("./BovinoActivityHistoryLeafletMap").then(
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

interface BovinoActivityHistoryTabProps {
  bovino: Bovino;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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

function collectTelemetryEntries(payload: unknown): TelemetryPoint[] {
  const queue: unknown[] = [payload];
  const found: TelemetryPoint[] = [];
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
    if (coordinates) {
      found.push(coordinates);
    }

    Object.values(record).forEach((value) => {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    });
  }

  return found;
}

function toIsoDateTime(date: string, time: string | undefined, fallback: "start" | "end"): string {
  const hhmmss = time && time.trim().length > 0
    ? `${time}:00`
    : fallback === "start"
      ? "00:00:00"
      : "23:59:59";

  // Mantiene hora local seleccionada sin desplazar por conversion UTC.
  return `${date}T${hhmmss}`;
}

export function BovinoActivityHistoryTab({ bovino }: Readonly<BovinoActivityHistoryTabProps>) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [points, setPoints] = useState<BovinoActivityPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collarIdentifier = useMemo(
    () => bovino.current_collar_uuid ?? bovino.current_collar_id ?? null,
    [bovino.current_collar_id, bovino.current_collar_uuid]
  );

  useEffect(() => {
    if (!collarIdentifier) {
      setPoints([]);
      setError(null);
      return;
    }

    let isActive = true;

    const loadTrackHistory = async () => {
      setLoading(true);
      setError(null);

      if (fromDate && toDate && fromDate > toDate) {
        setPoints([]);
        setError("El rango de fechas es invalido: la fecha inicial es mayor a la final.");
        setLoading(false);
        return;
      }

      if (
        fromDate &&
        toDate &&
        fromDate === toDate &&
        fromTime &&
        toTime &&
        fromTime > toTime
      ) {
        setPoints([]);
        setError("El rango de horas es invalido para el mismo dia.");
        setLoading(false);
        return;
      }

      try {
        const payload = await apiFetchProducerCollarIotHistory(collarIdentifier, {
          from: fromDate ? toIsoDateTime(fromDate, fromTime, "start") : undefined,
          to: toDate ? toIsoDateTime(toDate, toTime, "end") : undefined,
          page: 1,
          limit: 500,
        });

        if (!isActive) {
          return;
        }

        const telemetry = collectTelemetryEntries(payload)
          .map((point, index) => ({ point, index }))
          .sort((a, b) => {
            if (a.point.timestamp && b.point.timestamp) {
              return new Date(a.point.timestamp).getTime() - new Date(b.point.timestamp).getTime();
            }
            if (a.point.timestamp) return 1;
            if (b.point.timestamp) return -1;
            return a.index - b.index;
          })
          .map((entry, index) => ({
            id: `${bovino.id}-${index}`,
            lat: entry.point.lat,
            lng: entry.point.lng,
            timestamp: entry.point.timestamp,
            batteryPercent: entry.point.batteryPercent,
          }));

        setPoints(telemetry);
      } catch (err) {
        if (isActive) {
          setPoints([]);
          setError(err instanceof Error ? err.message : "No fue posible cargar historial de ubicaciones.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadTrackHistory();

    return () => {
      isActive = false;
    };
  }, [bovino.id, collarIdentifier, fromDate, fromTime, toDate, toTime]);

  if (!collarIdentifier) {
    return (
      <DetailEmptyState
        icon={Activity}
        message="Este bovino no tiene collar asignado"
        description="Asigna un collar para habilitar el historial de actividad."
      />
    );
  }

  return (
    <div className="space-y-4">
      <FiltersLayout>
        <FiltersContainer>
          <FiltersRow>
            <DateRangeFilter
              startDate={fromDate}
              endDate={toDate}
              onStartDateChange={setFromDate}
              onEndDateChange={setToDate}
              startPlaceholder="Desde"
              endPlaceholder="Hasta"
            />

            <TimeRangeFilter
              startTime={fromTime}
              endTime={toTime}
              onStartTimeChange={setFromTime}
              onEndTimeChange={setToTime}
              startPlaceholder="Hora inicio"
              endPlaceholder="Hora fin"
            />
          </FiltersRow>
        </FiltersContainer>
      </FiltersLayout>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando historial de actividad...</span>
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : points.length === 0 ? (
        <DetailEmptyState
          icon={MapPin}
          message="Sin datos de recorrido para el periodo"
          description="Ajusta el rango de fechas para consultar otras lecturas de actividad."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Historial de actividad del bovino</h3>
          </div>
          <div className="h-96 w-full transition-[height] duration-300 ease-out hover:h-[34rem]">
            <LeafletMap points={points} />
          </div>
        </div>
      )}
    </div>
  );
}
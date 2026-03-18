"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { FileText, MapPin, Building2, Clock, AlertTriangle } from "lucide-react";
import {
  DetailHeader,
  DetailTabBar,
  DetailEmptyState,
} from "@/shared/ui/detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { AdminCuarentenaEstadoBadge } from "./AdminCuarentenaEstadoBadge";
import type { useAdminCuarentenaDetail, DetailTab } from "./hooks/useAdminCuarentenaDetail";

interface LeafletMapProps {
  points: { id: string; title: string; status: string; quarantineType: string; lat: number; lng: number; uppName: string | null; producerName: string | null }[];
  onMarkerClick: (id: string) => void;
}

const SinglePointMap = dynamic<LeafletMapProps>(
  () => import("./CuarentenasLeafletMap").then((m) => m.default as ComponentType<LeafletMapProps>),
  { ssr: false }
);

type Props = ReturnType<typeof useAdminCuarentenaDetail>;

const TABS: { key: DetailTab; label: string; icon: typeof FileText }[] = [
  { key: "resumen",  label: "Resumen",   icon: FileText },
  { key: "upp",      label: "Rancho",    icon: Building2 },
  { key: "mapa",     label: "Mapa",      icon: MapPin },
  { key: "historial",label: "Historial", icon: Clock },
];

const STATUS_LABELS: Record<string, string> = {
  active:    "Activa",
  released:  "Liberada",
  suspended: "Suspendida",
};

export function AdminCuarentenaDetailContent({
  quarantine: q,
  loading,
  error,
  activeTab,
  setActiveTab,
  statusSaving,
  statusError,
  handleStatusChange,
}: Readonly<Props>) {
  if (loading) return <p className="py-16 text-center text-muted-foreground">Cargando…</p>;
  if (error || !q)  return <DetailEmptyState icon={AlertTriangle} message={error || "Cuarentena no encontrada"} description="Puede que haya sido eliminada o no tengas acceso." />;

  const mapPoints = q.locationLat != null && q.locationLng != null
    ? [{
        id:             q.id,
        title:         q.title,
        status:        q.status,
        quarantineType: q.quarantineType,
        lat:           q.locationLat,
        lng:           q.locationLng,
        uppName:       q.uppName,
        producerName:  q.producerName,
      }]
    : [];

  return (
    <div className="space-y-4">
      <DetailHeader
        title={q.title}
        subtitle={q.uppName ? `${q.uppName} — ${q.producerName ?? ""}` : "Sin rancho específico"}
        backHref="/admin/quarantines"
        backLabel="Cuarentenas"
        status={q.status}
        statusLabel={STATUS_LABELS[q.status] ?? q.status}
        statusVariant={q.status}
      />

      {/* Acciones de estado */}
      <div className="flex flex-wrap gap-2 items-center">
        {q.status !== "released" && (
          <Button
            size="sm"
            variant="outline"
            className="text-green-700 border-green-300 hover:bg-green-50"
            disabled={statusSaving}
            onClick={() => void handleStatusChange("released")}
          >
            Liberar cuarentena
          </Button>
        )}
        {q.status === "active" && (
          <Button
            size="sm"
            variant="outline"
            className="text-orange-700 border-orange-300 hover:bg-orange-50"
            disabled={statusSaving}
            onClick={() => void handleStatusChange("suspended")}
          >
            Suspender
          </Button>
        )}
        {q.status === "suspended" && (
          <Button
            size="sm"
            variant="outline"
            className="text-blue-700 border-blue-300 hover:bg-blue-50"
            disabled={statusSaving}
            onClick={() => void handleStatusChange("active")}
          >
            Reactivar
          </Button>
        )}
        {statusError && <p className="text-xs text-destructive">{statusError}</p>}
      </div>

      <DetailTabBar
        tabs={TABS}
        active={activeTab}
        onChange={(k) => setActiveTab(k as DetailTab)}
      />

      {/* ── RESUMEN ─────────────────────────────────────────────────────────── */}
      {activeTab === "resumen" && (
        <Card>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <AdminCuarentenaEstadoBadge status={q.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-medium capitalize">{q.quarantineType === "state" ? "Estatal" : "Operacional"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="font-medium">{new Date(q.startedAt).toLocaleDateString("es-MX")}</p>
              </div>
              {q.releasedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Liberada</p>
                  <p className="font-medium">{new Date(q.releasedAt).toLocaleDateString("es-MX")}</p>
                </div>
              )}
            </div>
            {q.reason && (
              <div>
                <p className="text-xs text-muted-foreground">Motivo</p>
                <p>{q.reason}</p>
              </div>
            )}
            {q.epidemiologicalNote && (
              <div>
                <p className="text-xs text-muted-foreground">Nota epidemiológica</p>
                <p className="whitespace-pre-wrap">{q.epidemiologicalNote}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── RANCHO ──────────────────────────────────────────────────────────── */}
      {activeTab === "upp" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rancho / UPP</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {q.uppId ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-medium">{q.uppName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Código UPP</p>
                  <p className="font-mono text-xs">{q.uppCode ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Productor</p>
                  <p className="font-medium">{q.producerName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p>{q.addressText ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Animales registrados</p>
                  <p className="font-semibold">{q.animalCount}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Cuarentena sin rancho asignado (estatal).</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── MAPA ────────────────────────────────────────────────────────────── */}
      {activeTab === "mapa" && (
        <div className="rounded-xl border overflow-hidden h-96">
          {mapPoints.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Sin coordenadas disponibles para este rancho.
            </div>
          ) : (
            <SinglePointMap points={mapPoints} onMarkerClick={() => {}} />
          )}
        </div>
      )}

      {/* ── HISTORIAL ───────────────────────────────────────────────────────── */}
      {activeTab === "historial" && (
        <Card>
          <CardContent className="pt-4 text-sm space-y-1 text-muted-foreground">
            <p>Creada: {new Date(q.createdAt).toLocaleString("es-MX")}</p>
            {q.createdByUserId && <p>Creada por UID: {q.createdByUserId}</p>}
            {q.releasedAt && <p>Liberada: {new Date(q.releasedAt).toLocaleString("es-MX")}</p>}
            {q.releasedByUserId && <p>Liberada por UID: {q.releasedByUserId}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

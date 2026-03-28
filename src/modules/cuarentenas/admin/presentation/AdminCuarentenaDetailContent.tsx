"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Building2, Clock, FileText, MapPin, AlertTriangle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailEmptyState,
  DetailHeader,
  DetailInfoGrid,
  DetailSidebarSection,
  DetailTabBar,
  DetailWorkspace,
} from "@/shared/ui";
import { AdminCuarentenaEstadoBadge } from "./AdminCuarentenaEstadoBadge";
import type { useAdminCuarentenaDetail, DetailTab } from "./hooks/useAdminCuarentenaDetail";
import { cn } from "@/shared/lib/utils";

interface LeafletMapProps {
  points: { id: string; title: string; status: string; quarantineType: string; lat: number; lng: number; uppName: string | null; producerName: string | null }[];
  onMarkerClick: (id: string) => void;
}

const SinglePointMap = dynamic<LeafletMapProps>(
  () => import("./CuarentenasLeafletMap").then((module) => module.default as ComponentType<LeafletMapProps>),
  { ssr: false }
);

type Props = ReturnType<typeof useAdminCuarentenaDetail> & {
  focusStatus?: boolean;
};

const TABS: { key: DetailTab; label: string; icon: typeof FileText }[] = [
  { key: "resumen", label: "Resumen", icon: FileText },
  { key: "upp", label: "Rancho", icon: Building2 },
  { key: "mapa", label: "Mapa", icon: MapPin },
  { key: "historial", label: "Historial", icon: Clock },
];

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  released: "Liberada",
  suspended: "Suspendida",
};

export function AdminCuarentenaDetailContent({
  quarantine: quarantine,
  loading,
  error,
  activeTab,
  setActiveTab,
  statusSaving,
  statusError,
  handleStatusChange,
  focusStatus = false,
}: Readonly<Props>) {
  if (loading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando cuarentena...</p>;
  }

  if (error || !quarantine) {
    return (
      <DetailEmptyState
        icon={AlertTriangle}
        message={error || "Cuarentena no encontrada"}
        description="Puede que haya sido eliminada o no tengas acceso."
      />
    );
  }

  const mapPoints = quarantine.locationLat != null && quarantine.locationLng != null
    ? [{
        id: quarantine.id,
        title: quarantine.title,
        status: quarantine.status,
        quarantineType: quarantine.quarantineType,
        lat: quarantine.locationLat,
        lng: quarantine.locationLng,
        uppName: quarantine.uppName,
        producerName: quarantine.producerName,
      }]
    : [];

  const mainContent =
    activeTab === "upp" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rancho / UPP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {quarantine.uppId ? (
            <DetailInfoGrid
              columns={2}
              items={[
                { label: "Nombre", icon: Building2, value: quarantine.uppName ?? "-" },
                { label: "Codigo UPP", icon: FileText, value: quarantine.uppCode ?? "-" },
                { label: "Productor", icon: Building2, value: quarantine.producerName ?? "-" },
                { label: "Direccion", icon: MapPin, value: quarantine.addressText ?? "-" },
                { label: "Animales registrados", icon: Clock, value: String(quarantine.animalCount) },
              ]}
            />
          ) : (
            <p className="text-muted-foreground">Cuarentena sin rancho asignado.</p>
          )}
        </CardContent>
      </Card>
    ) : activeTab === "mapa" ? (
      <div className="h-96 overflow-hidden rounded-xl border">
        {mapPoints.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sin coordenadas disponibles para este rancho.
          </div>
        ) : (
          <SinglePointMap points={mapPoints} onMarkerClick={() => {}} />
        )}
      </div>
    ) : activeTab === "historial" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Creada: {new Date(quarantine.createdAt).toLocaleString("es-MX")}</p>
          {quarantine.createdByUserId ? <p>Creada por UID: {quarantine.createdByUserId}</p> : null}
          {quarantine.releasedAt ? <p>Liberada: {new Date(quarantine.releasedAt).toLocaleString("es-MX")}</p> : null}
          {quarantine.releasedByUserId ? <p>Liberada por UID: {quarantine.releasedByUserId}</p> : null}
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen epidemiologico</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailInfoGrid
              columns={2}
              items={[
                { label: "Estado", icon: FileText, value: <AdminCuarentenaEstadoBadge status={quarantine.status} /> },
                { label: "Tipo", icon: FileText, value: quarantine.quarantineType === "state" ? "Estatal" : "Operacional" },
                { label: "Inicio", icon: Clock, value: new Date(quarantine.startedAt).toLocaleDateString("es-MX") },
                {
                  label: "Liberada",
                  icon: Clock,
                  value: quarantine.releasedAt ? new Date(quarantine.releasedAt).toLocaleDateString("es-MX") : "Activa",
                },
                { label: "Motivo", icon: AlertTriangle, value: quarantine.reason ?? "Sin motivo registrado" },
                {
                  label: "Nota epidemiologica",
                  icon: FileText,
                  value: quarantine.epidemiologicalNote ?? "Sin nota epidemiologica",
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <DetailHeader
        title={quarantine.title}
        subtitle={quarantine.uppName ? `${quarantine.uppName} - ${quarantine.producerName ?? ""}` : "Sin rancho especifico"}
        backHref="/admin/quarantines"
        backLabel="Cuarentenas"
        status={quarantine.status}
        statusLabel={STATUS_LABELS[quarantine.status] ?? quarantine.status}
        statusVariant={quarantine.status}
      />

      {statusError ? <p className="text-sm text-destructive">{statusError}</p> : null}

      <DetailWorkspace
        summary={
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rancho</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{quarantine.uppName ?? "Sin rancho asignado"}</p>
                <p className="text-muted-foreground">{quarantine.producerName ?? "Sin productor"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cobertura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{quarantine.animalCount} animales</p>
                <p className="text-muted-foreground">{quarantine.quarantineType === "state" ? "Estatal" : "Operacional"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <AdminCuarentenaEstadoBadge status={quarantine.status} />
                <p className="text-muted-foreground">Inicio: {new Date(quarantine.startedAt).toLocaleDateString("es-MX")}</p>
              </CardContent>
            </Card>
          </div>
        }
        tabs={<DetailTabBar tabs={TABS} active={activeTab} onChange={(key) => setActiveTab(key as DetailTab)} />}
        main={mainContent}
        sidebar={
          <>
            <DetailSidebarSection
              title="Acciones Rapidas"
              className={cn(focusStatus && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background")}
              contentClassName="space-y-2"
            >
              {quarantine.status !== "released" ? (
                <Button type="button" variant="outline" className="w-full justify-start" disabled={statusSaving} onClick={() => void handleStatusChange("released")}>
                  Liberar cuarentena
                </Button>
              ) : null}
              {quarantine.status === "active" ? (
                <Button type="button" variant="outline" className="w-full justify-start" disabled={statusSaving} onClick={() => void handleStatusChange("suspended")}>
                  Suspender
                </Button>
              ) : null}
              {quarantine.status === "suspended" ? (
                <Button type="button" variant="outline" className="w-full justify-start" disabled={statusSaving} onClick={() => void handleStatusChange("active")}>
                  Reactivar
                </Button>
              ) : null}
              <Button type="button" variant={activeTab === "resumen" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => setActiveTab("resumen")}>
                Ver resumen
              </Button>
              <Button type="button" variant={activeTab === "mapa" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => setActiveTab("mapa")}>
                Ver mapa
              </Button>
            </DetailSidebarSection>

            <DetailSidebarSection title="Informacion" contentClassName="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Creada</p>
                <p>{new Date(quarantine.createdAt).toLocaleString("es-MX")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Direccion</p>
                <p>{quarantine.addressText ?? "Sin direccion"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="break-all font-mono text-xs">{quarantine.id}</p>
              </div>
            </DetailSidebarSection>
          </>
        }
      />
    </div>
  );
}

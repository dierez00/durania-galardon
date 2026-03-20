"use client";

import { Activity, MapPin, ShieldAlert, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { SanitarioBadge } from "@/modules/bovinos/presentation";
import { formatDate, formatStatusLabel } from "./formatters";
import { MetricCard, SectionHeading } from "./shared";
import type { MvzRanchTabProps } from "./types";

export function MvzRanchOverviewView({ overview }: Readonly<MvzRanchTabProps>) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Resumen operativo"
        description="Visión general del rancho con foco sanitario, productor responsable y último seguimiento."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Animales activos" value={overview.active_animals} />
        <MetricCard label="En tratamiento" value={overview.animals_in_treatment} />
        <MetricCard label="Incidencias activas" value={overview.active_incidents} />
        <MetricCard label="Visitas registradas" value={overview.total_visits} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto del rancho</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Productor</p>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{overview.producer_name}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado UPP</p>
              <SanitarioBadge estado={overview.upp_status} />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Alerta sanitaria</p>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <span>{formatStatusLabel(overview.sanitary_alert)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ubicación</p>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{overview.address_text || "Sin dirección registrada"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Última visita</p>
              <p className="mt-1 font-medium">{formatDate(overview.last_visit_at)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Última inspección</p>
              <p className="mt-1 font-medium">{formatDate(overview.last_inspection_at)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cobertura</p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Activity className="h-4 w-4 text-muted-foreground" />
                {overview.pending_vaccinations} vacunaciones pendientes
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

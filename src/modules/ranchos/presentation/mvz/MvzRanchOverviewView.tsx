"use client";

import Link from "next/link";
import {
  Activity,
  CalendarPlus2,
  ClipboardPlus,
  MapPin,
  ShieldAlert,
  Syringe,
  UserRound,
} from "lucide-react";
import { buildProjectHref } from "@/modules/workspace/presentation/workspace-routing";
import { SanitarioBadge } from "@/modules/bovinos/presentation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { formatDate, formatStatusLabel } from "./formatters";
import { MetricCard, SectionHeading } from "./shared";
import type { MvzRanchTabProps } from "./types";

const QUICK_ACTIONS = [
  {
    key: "incidencias",
    label: "Registrar incidencia",
    description: "Abre el formulario para capturar un evento sanitario nuevo.",
    icon: ClipboardPlus,
  },
  {
    key: "vacunacion",
    label: "Registrar vacunación",
    description: "Agrega una nueva dosis o actualiza el calendario del rancho.",
    icon: Syringe,
  },
  {
    key: "visitas",
    label: "Programar visita",
    description: "Agenda la siguiente visita y deja listo su seguimiento.",
    icon: CalendarPlus2,
  },
] as const;

export function MvzRanchOverviewView({ uppId, overview }: Readonly<MvzRanchTabProps>) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Resumen del rancho"
        description="Consulta lo más importante del rancho y entra rápido a las tareas de seguimiento."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Animales activos" value={overview.active_animals} />
        <MetricCard label="En tratamiento" value={overview.animals_in_treatment} />
        <MetricCard label="Vacunaciones pendientes" value={overview.pending_vaccinations} />
        <MetricCard label="Incidencias activas" value={overview.active_incidents} />
        <MetricCard label="Última inspección" value={formatDate(overview.last_inspection_at)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {QUICK_ACTIONS.map(({ key, label, description, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-border bg-muted/60 p-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{description}</p>
              <Button asChild size="sm">
                <Link href={`${buildProjectHref("mvz", uppId, key)}?action=nuevo`}>
                  Abrir formulario
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Visitas registradas</p>
              <p className="mt-1 font-medium">{overview.total_visits}</p>
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

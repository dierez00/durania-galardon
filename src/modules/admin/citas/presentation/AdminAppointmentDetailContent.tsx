"use client";

import { CalendarDays, Clock3, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";
import { CitaEstadoBadge } from "./CitaEstadoBadge";
import { getAppointmentStatusLabel } from "./appointment-status";
import type { useAdminAppointmentDetail } from "./hooks/useAdminAppointmentDetail";
import type { CitaStatus } from "@/modules/admin/citas/domain/entities/CitaEntity";
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
import { cn } from "@/shared/lib/utils";

type Props = ReturnType<typeof useAdminAppointmentDetail> & {
  focusStatus?: boolean;
};

const TABS = [
  { key: "overview", label: "Overview", icon: UserRound },
  { key: "notes", label: "Notas", icon: MessageSquareText },
] as const;

const STATUS_OPTIONS: Array<{ key: CitaStatus; label: string }> = [
  { key: "requested", label: "Marcar solicitada" },
  { key: "contacted", label: "Marcar contactada" },
  { key: "scheduled", label: "Marcar agendada" },
  { key: "discarded", label: "Descartar" },
];

export function AdminAppointmentDetailContent({
  appointment,
  loading,
  error,
  activeTab,
  handleTabChange,
  statusSaving,
  updateStatus,
  focusStatus = false,
}: Readonly<Props>) {
  if (loading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando cita...</p>;
  }

  if (error || !appointment) {
    return (
      <DetailEmptyState
        icon={CalendarDays}
        message={error || "No se encontro la cita."}
        description="Verifica el enlace o regresa al listado de citas."
      />
    );
  }

  const mainContent =
    activeTab === "notes" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas y contexto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notas enviadas</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {appointment.notes?.trim() || "La solicitud no incluye notas adicionales."}
            </p>
          </div>
          <DetailInfoGrid
            columns={2}
            items={[
              { label: "Correo", icon: Mail, value: appointment.email ?? "Sin correo" },
              { label: "Telefono", icon: Phone, value: appointment.phone ?? "Sin telefono" },
              { label: "Servicio", icon: CalendarDays, value: appointment.requested_service },
              {
                label: "Fecha preferida",
                icon: Clock3,
                value: appointment.requested_date
                  ? new Date(appointment.requested_date).toLocaleDateString("es-MX")
                  : "Sin fecha preferida",
              },
            ]}
          />
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen de solicitud</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailInfoGrid
              columns={2}
              items={[
                { label: "Solicitante", icon: UserRound, value: appointment.full_name },
                { label: "Servicio", icon: CalendarDays, value: appointment.requested_service },
                {
                  label: "Fecha solicitada",
                  icon: CalendarDays,
                  value: appointment.requested_date
                    ? new Date(appointment.requested_date).toLocaleDateString("es-MX")
                    : "Sin fecha definida",
                },
                {
                  label: "Hora solicitada",
                  icon: Clock3,
                  value: appointment.requested_time ?? "Sin hora definida",
                },
                { label: "Telefono", icon: Phone, value: appointment.phone ?? "Sin telefono" },
                { label: "Correo", icon: Mail, value: appointment.email ?? "Sin correo" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas de la solicitud</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {appointment.notes?.trim() || "La solicitud no incluye notas adicionales."}
            </p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <DetailHeader
        title={appointment.full_name}
        subtitle={appointment.requested_service}
        backHref="/admin/appointments"
        backLabel="Citas"
      />

      <DetailWorkspace
        summary={
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Solicitante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{appointment.full_name}</p>
                <p className="text-muted-foreground">{appointment.email ?? appointment.phone ?? "Sin contacto"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Servicio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{appointment.requested_service}</p>
                <p className="text-muted-foreground">
                  {appointment.requested_date
                    ? new Date(appointment.requested_date).toLocaleDateString("es-MX")
                    : "Sin fecha definida"}
                  {appointment.requested_time ? ` · ${appointment.requested_time}` : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estado actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <CitaEstadoBadge status={appointment.status} />
                <p className="text-muted-foreground">{getAppointmentStatusLabel(appointment.status)}</p>
              </CardContent>
            </Card>
          </div>
        }
        tabs={
          <DetailTabBar
            tabs={TABS as unknown as Array<{ key: string; label: string }>}
            active={activeTab}
            onChange={(key) => handleTabChange(key as "overview" | "notes")}
          />
        }
        main={mainContent}
        sidebar={
          <>
            <DetailSidebarSection
              title="Acciones Rapidas"
              className={cn(focusStatus && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background")}
              contentClassName="space-y-2"
            >
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={appointment.status === option.key ? "secondary" : "outline"}
                  className="w-full justify-start"
                  disabled={statusSaving || appointment.status === option.key}
                  onClick={() => void updateStatus(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </DetailSidebarSection>

            <DetailSidebarSection title="Informacion" contentClassName="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Creada</p>
                <p>{new Date(appointment.created_at).toLocaleString("es-MX")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="break-all font-mono text-xs">{appointment.id}</p>
              </div>
            </DetailSidebarSection>
          </>
        }
      />
    </div>
  );
}

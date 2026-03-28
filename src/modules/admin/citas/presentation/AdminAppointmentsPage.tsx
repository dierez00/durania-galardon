"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, PhoneCall } from "lucide-react";
import { CitasFilters } from "./CitasFilters";
import { CitasList } from "./CitasList";
import { useAdminAppointments } from "./hooks/useAdminAppointments";
import { canAdvanceAppointmentStatus, getNextAppointmentStatus } from "./appointment-status";
import type { Cita } from "@/modules/admin/citas/domain/entities/CitaEntity";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function AdminAppointmentsPage() {
  const router = useRouter();
  const {
    appointments,
    total,
    rawTotal,
    filters,
    setFilters,
    loading,
    error,
    statusUpdatingId,
    updateAppointmentStatus,
  } = useAdminAppointments();

  const summary = useMemo(() => {
    return {
      requested: appointments.filter((item) => item.status === "requested").length,
      contacted: appointments.filter((item) => item.status === "contacted").length,
      scheduled: appointments.filter((item) => item.status === "scheduled").length,
      discarded: appointments.filter((item) => item.status === "discarded").length,
    };
  }, [appointments]);

  const handleViewMore = useCallback(
    (appointmentId: string) => {
      router.push(`/admin/appointments/${appointmentId}?tab=overview`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (appointmentId: string) => {
      router.push(`/admin/appointments/${appointmentId}?tab=overview&focus=status`);
    },
    [router]
  );

  const handleStatusChange = useCallback(
    async (appointment: Cita) => {
      const nextStatus = getNextAppointmentStatus(appointment.status);
      if (nextStatus === appointment.status) {
        return;
      }

      await updateAppointmentStatus(appointment.id, nextStatus);
    },
    [updateAppointmentStatus]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Citas publicas</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes recibidas desde el portal y seguimiento operativo del equipo admin.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Solicitadas", value: summary.requested, icon: Clock3 },
          { label: "Contactadas", value: summary.contacted, icon: PhoneCall },
          { label: "Agendadas", value: summary.scheduled, icon: CheckCircle2 },
          { label: "Mostradas", value: total, icon: CalendarDays, helper: `${rawTotal} totales` },
        ].map(({ label, value, icon: Icon, helper }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de cita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CitasFilters filters={filters} onChange={setFilters} />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <CitasList
              citas={appointments}
              onEdit={handleEdit}
              onViewMore={handleViewMore}
              onStatusChange={handleStatusChange}
              isStatusActionDisabled={(appointment) =>
                statusUpdatingId === appointment.id || !canAdvanceAppointmentStatus(appointment.status)
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
import { CalendarDays, FileClock, ShieldAlert, Stethoscope, Tractor, Users } from "lucide-react";
import { CitaEstadoBadge } from "@/modules/admin/citas/presentation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { Skeleton } from "@/shared/ui/skeleton";
import { getAccessToken } from "@/shared/lib/auth-session";
import { toneClass } from "@/shared/ui/theme";

interface AdminKpis {
  totalUpps: number;
  activeProducers: number;
  activeMvz: number;
  pendingExports: number;
  activeQuarantines: number;
  pendingAppointments: number;
}

interface AdminDashboardChartPoint {
  period: string;
  total: number;
}

interface AdminAppointmentStatusPoint {
  key: "requested" | "contacted" | "scheduled" | "discarded";
  label: string;
  total: number;
}

interface AdminDashboardAppointmentPreview {
  id: string;
  full_name: string;
  requested_service: string;
  requested_date: string | null;
  requested_time: string | null;
  status: "requested" | "contacted" | "scheduled" | "discarded";
  created_at: string;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [exportsByMonth, setExportsByMonth] = useState<AdminDashboardChartPoint[]>([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<AdminAppointmentStatusPoint[]>([]);
  const [appointmentsPreview, setAppointmentsPreview] = useState<AdminDashboardAppointmentPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesión activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok || !body.data?.kpis) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar el dashboard.");
      setLoading(false);
      return;
    }

    setKpis(body.data.kpis);
    setExportsByMonth(body.data.charts?.exportsByMonth ?? []);
    setAppointmentsByStatus(body.data.charts?.appointmentsByStatus ?? []);
    setAppointmentsPreview(body.data.appointmentsPreview ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const appointmentChartData = useMemo(
    () =>
      appointmentsByStatus.map((item) => ({
        ...item,
        fill:
          item.key === "requested"
            ? "var(--warning)"
            : item.key === "contacted"
              ? "var(--info)"
              : item.key === "scheduled"
                ? "var(--success)"
                : "var(--tone-neutral)",
      })),
    [appointmentsByStatus]
  );

  const kpiCards = [
    { label: "UPPs registradas", value: kpis?.totalUpps, icon: Tractor, tone: "brand" as const },
    { label: "Productores activos", value: kpis?.activeProducers, icon: Users, tone: "success" as const },
    { label: "MVZ activos", value: kpis?.activeMvz, icon: Stethoscope, tone: "info" as const },
    { label: "Exportaciones pendientes", value: kpis?.pendingExports, icon: FileClock, tone: "warning" as const },
    { label: "Cuarentenas activas", value: kpis?.activeQuarantines, icon: ShieldAlert, tone: "error" as const },
    { label: "Citas pendientes", value: kpis?.pendingAppointments, icon: CalendarDays, tone: "accent" as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Estatal</h1>
        <p className="text-sm text-muted-foreground">Indicadores generales para el seguimiento administrativo.</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${toneClass(tone, "icon")}`} />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{value ?? 0}</p>}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exportaciones por mes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : (
              <ChartContainer
                className="h-72 w-full"
                config={{
                  total: { label: "Exportaciones", color: "var(--highlight)" },
                }}
              >
                <BarChart data={exportsByMonth} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={8} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución de citas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : (
              <>
                <ChartContainer
                  className="h-64 w-full"
                  config={{
                    requested: { label: "Solicitadas", color: "var(--warning)" },
                    contacted: { label: "Contactadas", color: "var(--info)" },
                    scheduled: { label: "Agendadas", color: "var(--success)" },
                    discarded: { label: "Descartadas", color: "var(--tone-neutral)" },
                  }}
                >
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="label" />} />
                    <Pie
                      data={appointmentChartData}
                      dataKey="total"
                      nameKey="label"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {appointmentChartData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="grid grid-cols-2 gap-2">
                  {appointmentsByStatus.map((item) => (
                    <div key={item.key} className="rounded-md border border-border bg-muted/25 px-3 py-2 text-sm">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-2xl font-bold">{item.total}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Citas recientes</CardTitle>
              <p className="text-sm text-muted-foreground">Últimas solicitudes recibidas desde el portal público.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/appointments">Ver más</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : appointmentsPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay citas registradas todavía.</p>
            ) : (
              <div className="space-y-3">
                {appointmentsPreview.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/10 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{appointment.full_name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.requested_service}</p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.requested_date
                          ? new Date(appointment.requested_date).toLocaleDateString("es-MX")
                          : new Date(appointment.created_at).toLocaleDateString("es-MX")}
                        {appointment.requested_time ? ` · ${appointment.requested_time}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <CitaEstadoBadge status={appointment.status} />
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/appointments/${appointment.id}?tab=overview`}>Ver más</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Beef,
  FileCog,
  FileText,
  Grid3x3,
  Package,
  ShieldAlert,
  Truck,
  User,
  type LucideIcon,
} from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { getAccessToken } from "@/shared/lib/auth-session";
import { useProducerUppContext } from "@/modules/producer/ranchos/presentation";
import { toneClass, type SemanticTone } from "@/shared/ui/theme";

interface ProducerKpis {
  totalUpps: number;
  totalAnimals: number;
  bovinosInTransit: number;
  activeMovements: number;
  activeExports: number;
  pendingDocuments: number;
  activeQuarantines: number;
}

interface DashboardQuickAction {
  key: string;
  label: string;
  description: string;
  href: string;
  tone: SemanticTone;
  icon: "animals" | "movements" | "exports" | "documents" | "settings" | "profile";
}

interface DashboardActivityPoint {
  period: string;
  movements: number;
  exports: number;
}

interface DashboardDocumentStatus {
  key: "pending" | "validated" | "expired" | "rejected";
  label: string;
  total: number;
}

const ACTION_ICON_MAP: Record<DashboardQuickAction["icon"], LucideIcon> = {
  animals: Beef,
  movements: Truck,
  exports: Package,
  documents: FileText,
  settings: FileCog,
  profile: User,
};

const DOCUMENT_STATUS_TONE_MAP: Record<DashboardDocumentStatus["key"], SemanticTone> = {
  pending: "warning",
  validated: "success",
  expired: "error",
  rejected: "neutral",
};

function uppStatusVariant(status: string): "default" | "warning" | "neutral" {
  if (status === "active") return "default";
  if (status === "quarantined") return "warning";
  return "neutral";
}

export default function ProducerDashboardPage() {
  return <ProducerDashboardPageContent />;
}

interface ProducerDashboardPageProps {
  title?: string;
  description?: string;
  lockedUppId?: string | null;
  showProjectCards?: boolean;
  forceOrganizationScope?: boolean;
}

export function ProducerDashboardPageContent({
  title = "Inicio del productor",
  description,
  lockedUppId,
  showProjectCards = true,
  forceOrganizationScope = false,
}: ProducerDashboardPageProps = {}) {
  const { upps, selectedUppId, selectedUpp, setSelectedUppId, hydrated } = useProducerUppContext();
  const [kpis, setKpis] = useState<ProducerKpis | null>(null);
  const [quickActions, setQuickActions] = useState<DashboardQuickAction[]>([]);
  const [activityTrend, setActivityTrend] = useState<DashboardActivityPoint[]>([]);
  const [documentStatus, setDocumentStatus] = useState<DashboardDocumentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const effectiveSelectedUppId = forceOrganizationScope ? null : lockedUppId ?? selectedUppId;
  const effectiveSelectedUpp = useMemo(
    () => upps.find((upp) => upp.id === effectiveSelectedUppId) ?? selectedUpp,
    [effectiveSelectedUppId, selectedUpp, upps]
  );

  const loadKpis = useCallback(async (uppId: string | null) => {
    setLoading(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesión activa.");
      setLoading(false);
      return;
    }

    const params = uppId ? `?uppId=${encodeURIComponent(uppId)}` : "";
    const response = await fetch(`/api/producer/dashboard${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar el panel.");
      setLoading(false);
      return;
    }

    setKpis(body.data.kpis ?? null);
    setQuickActions(body.data.quickActions ?? []);
    setActivityTrend(body.data.charts?.activityTrend ?? []);
    setDocumentStatus(body.data.charts?.documentStatus ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hydrated) {
      void loadKpis(effectiveSelectedUppId ?? null);
    }
  }, [effectiveSelectedUppId, hydrated, loadKpis]);

  const kpiCards = [
    { label: "Ranchos (UPPs)", value: kpis?.totalUpps, icon: Grid3x3, tone: "secondary" },
    { label: "Bovinos activos", value: kpis?.totalAnimals, icon: Beef, tone: "brand" },
    { label: "Bovinos en transito", value: kpis?.bovinosInTransit, icon: Truck, tone: "info" },
    { label: "Movilizaciones activas", value: kpis?.activeMovements, icon: Package, tone: "accent" },
    { label: "Exportaciones en proceso", value: kpis?.activeExports, icon: Package, tone: "secondary" },
    { label: "Documentos pendientes", value: kpis?.pendingDocuments, icon: FileText, tone: "warning" },
    { label: "Cuarentenas activas", value: kpis?.activeQuarantines, icon: ShieldAlert, tone: "error" },
  ] satisfies Array<{ label: string; value: number | undefined; icon: typeof Grid3x3; tone: SemanticTone }>;

  const documentStatusChartData = useMemo(
    () =>
      documentStatus.map((item) => ({
        ...item,
        fill: `var(--color-${item.key})`,
      })),
    [documentStatus]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {description ??
            (effectiveSelectedUpp
              ? `Indicadores de ${effectiveSelectedUpp.name}`
              : "Vista general de toda la operación del productor.")}
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      {showProjectCards ? (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ranchos / UPPs
          </h2>
          {effectiveSelectedUppId ? (
            <button
              onClick={() => setSelectedUppId(null)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Ver todos
            </button>
          ) : null}
        </div>

        <div className="sm:hidden">
          <Select
            value={effectiveSelectedUppId ?? "__all__"}
            onValueChange={(value) => setSelectedUppId(value === "__all__" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar rancho..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los ranchos</SelectItem>
              {upps.map((upp) => (
                <SelectItem key={upp.id} value={upp.id}>
                  {upp.name} {upp.upp_code ? `(${upp.upp_code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {!hydrated
            ? Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-lg" />
              ))
            : upps.map((upp) => (
                <button
                  key={upp.id}
                  onClick={() => setSelectedUppId(effectiveSelectedUppId === upp.id ? null : upp.id)}
                  className={[
                    "rounded-lg border p-4 text-left transition-all hover:shadow-md",
                    effectiveSelectedUppId === upp.id
                      ? "border-primary bg-primary/6 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-brand-secondary/45 hover:bg-secondary/35",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{upp.name}</p>
                      {upp.upp_code ? (
                        <p className="font-mono text-xs text-muted-foreground">{upp.upp_code}</p>
                      ) : null}
                    </div>
                    <Badge variant={uppStatusVariant(upp.status)} className="shrink-0 text-xs">
                      {upp.status}
                    </Badge>
                  </div>
                  {upp.hectares_total ?? upp.herd_limit ? (
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      {upp.hectares_total ? <span>{upp.hectares_total} ha</span> : null}
                      {upp.herd_limit ? <span>Lim. {upp.herd_limit} cab.</span> : null}
                    </div>
                  ) : null}
                </button>
              ))}
          {hydrated && upps.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">No hay ranchos registrados.</p>
          ) : null}
        </div>
      </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {effectiveSelectedUpp ? `Indicadores · ${effectiveSelectedUpp.name}` : "Indicadores generales"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Accesos rapidos
        </h2>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = ACTION_ICON_MAP[action.icon];
              return (
                <Card key={action.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className={`h-4 w-4 ${toneClass(action.tone, "icon")}`} />
                      {action.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                    <Button asChild variant="outline" size="sm" className="w-full justify-start">
                      <Link href={action.href}>Abrir modulo</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {!quickActions.length ? (
              <p className="col-span-full text-sm text-muted-foreground">
                No hay accesos disponibles para el rol actual.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Analitica</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia de solicitudes (6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <ChartContainer
                  className="h-64 w-full"
                  config={{
                    movements: { label: "Movilizaciones", color: "var(--info)" },
                    exports: { label: "Exportaciones", color: "var(--highlight)" },
                  }}
                >
                  <BarChart data={activityTrend} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="movements" fill="var(--color-movements)" radius={6} />
                    <Bar dataKey="exports" fill="var(--color-exports)" radius={6} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado documental vigente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <>
                  <ChartContainer
                    className="h-64 w-full"
                    config={{
                      pending: { label: "En revision", color: "var(--warning)" },
                      validated: { label: "Validados", color: "var(--success)" },
                      expired: { label: "Vencidos", color: "var(--error)" },
                      rejected: { label: "Rechazados", color: "var(--tone-neutral)" },
                    }}
                  >
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="label" />} />
                      <Pie
                        data={documentStatusChartData}
                        dataKey="total"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={4}
                      >
                        {documentStatusChartData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  <div className="grid grid-cols-2 gap-2">
                    {documentStatus.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-md border border-border bg-muted/25 px-3 py-2 text-sm"
                      >
                        <p className={`font-medium ${toneClass(DOCUMENT_STATUS_TONE_MAP[item.key], "text")}`}>
                          {item.label}
                        </p>
                        <p className="text-2xl font-bold">{item.total}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

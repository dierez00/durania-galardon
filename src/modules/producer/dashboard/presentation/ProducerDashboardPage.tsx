"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Beef, FileText, Grid3x3, Package, ShieldAlert, Truck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { getAccessToken } from "@/shared/lib/auth-session";
import { useProducerUppContext } from "@/modules/producer/ranchos/presentation";

interface ProducerKpis {
  totalUpps: number;
  totalAnimals: number;
  bovinosInTransit: number;
  activeMovements: number;
  activeExports: number;
  pendingDocuments: number;
  activeQuarantines: number;
}

function uppStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "quarantined") return "destructive";
  return "secondary";
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
  title = "Dashboard Productor",
  description,
  lockedUppId,
  showProjectCards = true,
  forceOrganizationScope = false,
}: ProducerDashboardPageProps = {}) {
  const { upps, selectedUppId, selectedUpp, setSelectedUppId, hydrated } = useProducerUppContext();
  const [kpis, setKpis] = useState<ProducerKpis | null>(null);
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
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const params = uppId ? `?uppId=${encodeURIComponent(uppId)}` : "";
    const response = await fetch(`/api/producer/dashboard${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar dashboard.");
      setLoading(false);
      return;
    }

    setKpis(body.data.kpis ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hydrated) {
      void loadKpis(effectiveSelectedUppId ?? null);
    }
  }, [effectiveSelectedUppId, hydrated, loadKpis]);

  const kpiCards = [
    { label: "Ranchos (UPPs)", value: kpis?.totalUpps, icon: Grid3x3, color: "text-blue-500" },
    { label: "Bovinos activos", value: kpis?.totalAnimals, icon: Beef, color: "text-green-600" },
    { label: "Bovinos en transito", value: kpis?.bovinosInTransit, icon: Truck, color: "text-yellow-600" },
    { label: "Movilizaciones activas", value: kpis?.activeMovements, icon: Package, color: "text-orange-500" },
    { label: "Exportaciones en proceso", value: kpis?.activeExports, icon: Package, color: "text-purple-500" },
    { label: "Documentos pendientes", value: kpis?.pendingDocuments, icon: FileText, color: "text-red-500" },
    { label: "Cuarentenas activas", value: kpis?.activeQuarantines, icon: ShieldAlert, color: "text-destructive" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {description ??
            (effectiveSelectedUpp
              ? `Metricas de: ${effectiveSelectedUpp.name}`
              : "Vision global de toda la operacion del productor.")}
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
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border bg-card hover:border-primary/50",
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
          {effectiveSelectedUpp ? `Metricas - ${effectiveSelectedUpp.name}` : "Metricas globales"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{value ?? 0}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

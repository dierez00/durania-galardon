"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getAccessToken } from "@/shared/lib/auth-session";
import { useMvzRanchContext, useMvzRealtime } from "@/modules/ranchos/presentation/mvz";

interface MvzGlobalKpis {
  totalRanchosAsignados: number;
  totalAnimalesRegistrados: number;
  totalCitasActivas: number;
  alertasSanitariasActivas: number;
  vacunacionesPendientes: number;
  incidenciasRecientes: number;
}

interface AssignmentRow {
  assignment_id: string;
  upp_id: string;
  upp_name: string;
  upp_code: string | null;
  producer_name: string;
  sanitary_alert: string;
  active_animals: number;
}

export default function MvzDashboardPage() {
  return <MvzDashboardPageContent />;
}

interface MvzDashboardPageProps {
  title?: string;
  description?: string;
  showAssignmentsSelector?: boolean;
}

export function MvzDashboardPageContent({
  title = "Dashboard MVZ",
  description = "Resumen global y selector de ranchos asignados.",
  showAssignmentsSelector = true,
}: MvzDashboardPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedUppId, setSelectedUppId } = useMvzRanchContext();
  const [kpis, setKpis] = useState<MvzGlobalKpis | null>(null);
  const [ranchos, setRanchos] = useState<AssignmentRow[]>([]);
  const [localSelectedUppId, setLocalSelectedUppId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/mvz/dashboard", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar dashboard MVZ.");
      return;
    }

    const rows = (body.data.ranchosAsignados ?? []) as AssignmentRow[];
    setKpis(body.data.kpisGlobales ?? null);
    setRanchos(rows);

    const preferred = selectedUppId && rows.some((row) => row.upp_id === selectedUppId)
      ? selectedUppId
      : rows[0]?.upp_id ?? "";

    setLocalSelectedUppId(preferred);
  }, [selectedUppId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useMvzRealtime({
    onEvent: () => {
      void loadDashboard();
    },
  });

  const openRancho = (uppId: string) => {
    if (!uppId) {
      return;
    }

    setSelectedUppId(uppId);
    router.push(`/mvz/ranchos/${uppId}`);
  };

  const showSelectionHint = searchParams.get("selectRancho") === "1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {showSelectionHint ? (
        <p className="text-sm text-amber-700">Seleccione un rancho para continuar con el panel contextual.</p>
      ) : null}

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      {showAssignmentsSelector ? (
        <Card>
          <CardHeader>
            <CardTitle>Selector de ranchos asignados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={localSelectedUppId}
                onChange={(event) => setLocalSelectedUppId(event.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Selecciona un rancho</option>
                {ranchos.map((rancho) => (
                  <option key={rancho.assignment_id} value={rancho.upp_id}>
                    {rancho.upp_name} - {rancho.producer_name}
                  </option>
                ))}
              </select>
              <Button onClick={() => openRancho(localSelectedUppId)} disabled={!localSelectedUppId}>
                Abrir panel del rancho
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ranchos.map((rancho) => (
                <button
                  key={rancho.assignment_id}
                  type="button"
                  onClick={() => openRancho(rancho.upp_id)}
                  className="rounded-lg border p-4 text-left hover:bg-accent"
                >
                  <p className="font-semibold">{rancho.upp_name}</p>
                  <p className="text-xs text-muted-foreground">Productor: {rancho.producer_name}</p>
                  <p className="text-xs text-muted-foreground">Alerta: {rancho.sanitary_alert}</p>
                  <p className="text-xs text-muted-foreground">
                    Animales activos: {rancho.active_animals ?? 0}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total ranchos asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.totalRanchosAsignados ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total animales registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.totalAnimalesRegistrados ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Citas activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.totalCitasActivas ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas sanitarias activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.alertasSanitariasActivas ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vacunaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.vacunacionesPendientes ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidencias recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.incidenciasRecientes ?? 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

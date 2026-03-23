"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getAccessToken } from "@/shared/lib/auth-session";
import { useMvzRealtime } from "@/modules/ranchos/presentation/mvz";

interface MvzGlobalKpis {
  totalRanchosAsignados: number;
  totalAnimalesRegistrados: number;
  totalCitasActivas: number;
  alertasSanitariasActivas: number;
  vacunacionesPendientes: number;
  incidenciasRecientes: number;
}

export default function MvzDashboardPage() {
  return <MvzDashboardPageContent />;
}

interface MvzDashboardPageProps {
  title?: string;
  description?: string;
}

export function MvzDashboardPageContent({
  title = "Dashboard MVZ",
  description = "Resumen global de la operacion sanitaria MVZ.",
}: MvzDashboardPageProps) {
  const searchParams = useSearchParams();
  const [kpis, setKpis] = useState<MvzGlobalKpis | null>(null);
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

    setKpis(body.data.kpisGlobales ?? null);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useMvzRealtime({
    onEvent: () => {
      void loadDashboard();
    },
  });

  const showSelectionHint = searchParams.get("selectRancho") === "1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {showSelectionHint ? (
        <Alert variant="warning">
          <AlertDescription>
            Abre un rancho desde Inicio para continuar con el panel contextual.
          </AlertDescription>
        </Alert>
      ) : null}

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

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

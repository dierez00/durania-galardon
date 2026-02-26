<<<<<<< Updated upstream
"use client";
=======
import LegacyPage from "@/modules/producers/presentation/DashboardPage";
>>>>>>> Stashed changes

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getAccessToken } from "@/shared/lib/auth-session";

interface ProducerKpis {
  totalHeads: number;
  capacity: number;
  exportReady: number;
  activeAlerts: number;
}

export default function ProducerDashboardPage() {
  const [kpis, setKpis] = useState<ProducerKpis | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/producer/dashboard", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar dashboard.");
      return;
    }

    setKpis(body.data.kpis ?? null);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Productor</h1>
        <p className="text-sm text-muted-foreground">Resumen operativo de tu tenant productor.</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cabezas activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.totalHeads ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capacidad hato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.capacity ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listos exportacion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.exportReady ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.activeAlerts ?? 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

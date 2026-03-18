"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getAccessToken } from "@/shared/lib/auth-session";

interface AdminKpis {
  totalUpps: number;
  uppsActive: number;
  uppsInactive: number;
  activeReactors: number;
  monthlyExports: Record<string, number>;
  activeQuarantines: number;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<AdminKpis | null>(null);

  const loadDashboard = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return;
    }

    const response = await fetch("/api/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok || !body.data?.kpis) {
      return;
    }

    setKpis(body.data.kpis);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Estatal</h1>
        <p className="text-sm text-muted-foreground">KPIs globales para operacion administrativa.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">UPP activas/inactivas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Activas: {kpis?.uppsActive ?? 0}</p>
            <p className="text-sm">Inactivas: {kpis?.uppsInactive ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reactores activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.activeReactors ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Predios en cuarentena</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis?.activeQuarantines ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones rapidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/producers">Gestion de productores</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/mvz">Gestion de MVZ</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/quarantines">Cuarentenas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/audit">Auditoria y bitacora</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/appointments">Citas publicas</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getAccessToken } from "@/shared/lib/auth-session";
import { useMvzRanchContext, useMvzRealtime } from "@/modules/ranchos/presentation/mvz";

interface RanchOverview {
  upp_id: string;
  upp_name: string;
  upp_code: string | null;
  upp_status: string;
  producer_name: string;
  address_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  sanitary_alert: string;
  total_animals: number;
  active_animals: number;
  animals_in_treatment: number;
  pending_vaccinations: number;
  incidents_registered: number;
  active_incidents: number;
  total_visits: number;
  last_visit_at: string | null;
  last_inspection_at: string | null;
}

interface TabConfig {
  id: string;
  label: string;
  path: string;
}

const TABS: TabConfig[] = [
  { id: "resumen", label: "Resumen", path: "" },
  { id: "animales", label: "Animales", path: "animales" },
  { id: "historial-clinico", label: "Historial clinico", path: "historial-clinico" },
  { id: "vacunacion", label: "Vacunacion", path: "vacunacion" },
  { id: "incidencias", label: "Incidencias", path: "incidencias" },
  { id: "reportes", label: "Reportes", path: "reportes" },
  { id: "documentacion", label: "Documentacion", path: "documentacion" },
  { id: "visitas", label: "Visitas", path: "visitas" },
];

function resolveTabEndpoint(tab: string, uppId: string) {
  if (tab === "resumen") {
    return `/api/mvz/ranchos/${uppId}/reportes`;
  }

  return `/api/mvz/ranchos/${uppId}/${tab}`;
}

export default function RanchPanel({ tab }: { tab: string }) {
  const params = useParams<{ uppId: string }>();
  const uppId = params.uppId;
  const { setSelectedUppId } = useMvzRanchContext();
  const [overview, setOverview] = useState<RanchOverview | null>(null);
  const [tabData, setTabData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedTab = useMemo(() => {
    return TABS.some((item) => item.id === tab) ? tab : "resumen";
  }, [tab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const [overviewResponse, tabResponse] = await Promise.all([
      fetch(`/api/mvz/ranchos/${uppId}/overview`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      fetch(resolveTabEndpoint(selectedTab, uppId), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    ]);

    const overviewBody = await overviewResponse.json();
    const tabBody = await tabResponse.json();

    if (!overviewResponse.ok || !overviewBody.ok) {
      setErrorMessage(overviewBody.error?.message ?? "No fue posible cargar el contexto del rancho.");
      setLoading(false);
      return;
    }

    if (!tabResponse.ok || !tabBody.ok) {
      setErrorMessage(tabBody.error?.message ?? "No fue posible cargar modulo del rancho.");
      setOverview(overviewBody.data.overview ?? null);
      setLoading(false);
      return;
    }

    setOverview(overviewBody.data.overview ?? null);
    if (selectedTab === "reportes" || selectedTab === "resumen") {
      setTabData(tabBody.data.report ?? null);
    } else if (selectedTab === "animales") {
      setTabData(tabBody.data.animals ?? []);
    } else if (selectedTab === "historial-clinico") {
      setTabData(tabBody.data.tests ?? []);
    } else if (selectedTab === "vacunacion") {
      setTabData(tabBody.data.vaccinations ?? []);
    } else if (selectedTab === "incidencias") {
      setTabData(tabBody.data.incidents ?? []);
    } else if (selectedTab === "documentacion") {
      setTabData(tabBody.data.documents ?? []);
    } else if (selectedTab === "visitas") {
      setTabData(tabBody.data.visits ?? []);
    } else {
      setTabData(tabBody.data ?? null);
    }

    setLoading(false);
  }, [selectedTab, uppId]);

  useEffect(() => {
    setSelectedUppId(uppId);
  }, [setSelectedUppId, uppId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useMvzRealtime({
    uppId,
    onEvent: () => {
      void loadData();
    },
  });

  const tabLinks = TABS.map((item) => {
    const href = item.path ? `/mvz/ranchos/${uppId}/${item.path}` : `/mvz/ranchos/${uppId}`;
    return {
      id: item.id,
      label: item.label,
      href,
      active: selectedTab === item.id,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Rancho</h1>
        <p className="text-sm text-muted-foreground">Contexto operativo de UPP seleccionada por MVZ Gobierno.</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{overview?.upp_name ?? "Rancho"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">UPP: {overview?.upp_code ?? overview?.upp_id?.slice(0, 8) ?? "-"}</Badge>
            <Badge variant="outline">Productor: {overview?.producer_name ?? "-"}</Badge>
            <Badge variant="outline">Estado sanitario: {overview?.sanitary_alert ?? "-"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Ubicacion: {overview?.address_text ?? "Sin direccion"}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Animales activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overview?.active_animals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">En tratamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overview?.animals_in_treatment ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vacunaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overview?.pending_vaccinations ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Incidencias</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overview?.incidents_registered ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ultima inspeccion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{overview?.last_inspection_at ?? "Sin registro"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabLinks.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              item.active ? "bg-primary text-primary-foreground" : "bg-background"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tabLinks.find((item) => item.id === selectedTab)?.label ?? "Modulo"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(tabData, null, 2)}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

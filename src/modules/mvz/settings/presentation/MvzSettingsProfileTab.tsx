"use client";

import { useEffect, useState } from "react";
import { useTenantWorkspace } from "@/modules/workspace";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface MvzSettingsPayload {
  ok?: boolean;
  data?: {
    organization?: {
      name?: string;
      slug?: string;
      type?: string;
    };
    summary?: {
      activeMembers?: number;
      assignedProjects?: number;
      lastAssignedAt?: string | null;
      upcomingVisits?: number;
      openIncidents?: number;
    };
  };
  error?: {
    message?: string;
  };
}

export default function MvzSettingsProfileTab() {
  const workspace = useTenantWorkspace();
  const permissions = workspace.user?.permissions ?? [];
  const canEditOrganization = permissions.includes("mvz.tenant.write");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [summary, setSummary] = useState({
    activeMembers: 0,
    assignedProjects: 0,
    lastAssignedAt: null as string | null,
    upcomingVisits: 0,
    openIncidents: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setErrorMessage("No existe sesion activa.");
          return;
        }

        const response = await fetch("/api/mvz/settings", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const body = (await response.json()) as MvzSettingsPayload;
        if (!response.ok || !body.ok) {
          setErrorMessage(body.error?.message ?? "No fue posible cargar configuracion.");
          return;
        }

        setOrganizationName(body.data?.organization?.name ?? "");
        setOrganizationSlug(body.data?.organization?.slug ?? "");
        setOrganizationType(body.data?.organization?.type ?? "mvz");
        setSummary({
          activeMembers: body.data?.summary?.activeMembers ?? 0,
          assignedProjects: body.data?.summary?.assignedProjects ?? 0,
          lastAssignedAt: body.data?.summary?.lastAssignedAt ?? null,
          upcomingVisits: body.data?.summary?.upcomingVisits ?? 0,
          openIncidents: body.data?.summary?.openIncidents ?? 0,
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/mvz/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          organizationName,
        }),
      });

      const body = (await response.json()) as MvzSettingsPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar configuracion.");
        return;
      }

      setOrganizationName(body.data?.organization?.name ?? organizationName);
      setOrganizationSlug(body.data?.organization?.slug ?? organizationSlug);
      setOrganizationType(body.data?.organization?.type ?? organizationType);
      setSummary({
        activeMembers: body.data?.summary?.activeMembers ?? summary.activeMembers,
        assignedProjects: body.data?.summary?.assignedProjects ?? summary.assignedProjects,
        lastAssignedAt: body.data?.summary?.lastAssignedAt ?? summary.lastAssignedAt,
        upcomingVisits: body.data?.summary?.upcomingVisits ?? summary.upcomingVisits,
        openIncidents: body.data?.summary?.openIncidents ?? summary.openIncidents,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranchos asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : summary.assignedProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Miembros activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : summary.activeMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultima asignacion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {loading
                ? "-"
                : summary.lastAssignedAt
                  ? new Date(summary.lastAssignedAt).toLocaleDateString("es-MX")
                  : "Sin registro"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visitas proximas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : summary.upcomingVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidencias abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : summary.openIncidents}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil del panel</CardTitle>
          <CardDescription>
            Configuracion del tenant MVZ y resumen de la operacion asignada en este panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Nombre de la organizacion</Label>
            <Input
              id="organizationName"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              readOnly={!canEditOrganization}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationSlug">Slug</Label>
            <Input id="organizationSlug" value={organizationSlug} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationType">Tipo de tenant</Label>
            <Input id="organizationType" value={organizationType || "mvz"} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activeRole">Rol activo</Label>
            <Input id="activeRole" value={workspace.user?.roleName ?? workspace.user?.roleLabel ?? "-"} readOnly />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSave} disabled={!canEditOrganization || saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

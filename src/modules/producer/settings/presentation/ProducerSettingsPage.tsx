"use client";

import { useEffect, useState } from "react";
import { useTenantWorkspace } from "@/modules/workspace";
import ProducerDocumentosPage from "@/modules/producer/documents/presentation/ProducerDocumentosPage";
import ProducerEmpleadosPage from "@/modules/producer/empleados/presentation/ProducerEmpleadosPage";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface ProducerSettingsPayload {
  data?: {
    organization?: {
      name?: string;
      slug?: string;
    };
    profile?: {
      fullName?: string | null;
      status?: string;
    } | null;
    summary?: {
      activeMembers?: number;
      personalDocuments?: number;
      accessibleProjects?: number;
    };
  };
  error?: {
    message?: string;
  };
}

export default function ProducerSettingsPage() {
  const workspace = useTenantWorkspace();
  const permissions = workspace.user?.permissions ?? [];
  const canEdit = permissions.includes("producer.upp.write");
  const canViewDocuments = permissions.includes("producer.documents.read");
  const canViewEmployees = permissions.includes("producer.employees.read");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [summary, setSummary] = useState({
    activeMembers: 0,
    personalDocuments: 0,
    accessibleProjects: 0,
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

        const response = await fetch("/api/producer/settings", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const body = (await response.json()) as ProducerSettingsPayload & { ok?: boolean };
        if (!response.ok || !body.ok) {
          setErrorMessage(body.error?.message ?? "No fue posible cargar configuracion.");
          return;
        }

        setOrganizationName(body.data?.organization?.name ?? "");
        setFullName(body.data?.profile?.fullName ?? "");
        setSummary({
          activeMembers: body.data?.summary?.activeMembers ?? 0,
          personalDocuments: body.data?.summary?.personalDocuments ?? 0,
          accessibleProjects: body.data?.summary?.accessibleProjects ?? 0,
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

      const response = await fetch("/api/producer/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          organizationName,
          fullName,
        }),
      });

      const body = (await response.json()) as ProducerSettingsPayload & { ok?: boolean };
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar configuracion.");
        return;
      }

      setOrganizationName(body.data?.organization?.name ?? organizationName);
      setFullName(body.data?.profile?.fullName ?? fullName);
      setSummary({
        activeMembers: body.data?.summary?.activeMembers ?? summary.activeMembers,
        personalDocuments: body.data?.summary?.personalDocuments ?? summary.personalDocuments,
        accessibleProjects: body.data?.summary?.accessibleProjects ?? summary.accessibleProjects,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes organizacionales del tenant productor y administracion operativa.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranchos accesibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : summary.accessibleProjects}</p>
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
            <CardTitle className="text-base">Documentos del productor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : summary.personalDocuments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos organizacionales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Nombre de la organizacion</Label>
            <Input
              id="organizationName"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              readOnly={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre del productor</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              readOnly={!canEdit}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSave} disabled={!canEdit || saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {canViewDocuments ? (
        <ProducerDocumentosPage
          scope="personal"
          title="Documentos del productor"
          description="Configuracion documental del nivel organizacional."
        />
      ) : null}

      {canViewEmployees ? (
        <ProducerEmpleadosPage
          title="Miembros y accesos"
          description="Gestion de administradores, empleados y alcances por UPP."
        />
      ) : null}
    </div>
  );
}

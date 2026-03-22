"use client";

import { useEffect, useState } from "react";
import { useTenantWorkspace } from "@/modules/workspace";
import ProducerDocumentosPage from "@/modules/producer/documents/presentation/ProducerDocumentosPage";
import ProducerEmpleadosPage from "@/modules/producer/empleados/presentation/ProducerEmpleadosPage";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface ProducerSettingsPayload {
  data?: {
    organization?: {
      name?: string;
      slug?: string;
      type?: string;
    };
    summary?: {
      activeMembers?: number;
      accessibleProjects?: number;
      pendingDocuments?: number;
      rejectedDocuments?: number;
    };
  };
  error?: {
    message?: string;
  };
}

export default function ProducerSettingsPage() {
  const workspace = useTenantWorkspace();
  const permissions = workspace.user?.permissions ?? [];
  const canEditOrganization = permissions.includes("producer.tenant.write");
  const canViewDocuments = permissions.includes("producer.documents.read");
  const canViewEmployees = permissions.includes("producer.employees.read");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [summary, setSummary] = useState({
    activeMembers: 0,
    accessibleProjects: 0,
    pendingDocuments: 0,
    rejectedDocuments: 0,
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
        setOrganizationSlug(body.data?.organization?.slug ?? "");
        setOrganizationType(body.data?.organization?.type ?? "producer");
        setSummary({
          activeMembers: body.data?.summary?.activeMembers ?? 0,
          accessibleProjects: body.data?.summary?.accessibleProjects ?? 0,
          pendingDocuments: body.data?.summary?.pendingDocuments ?? 0,
          rejectedDocuments: body.data?.summary?.rejectedDocuments ?? 0,
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
        }),
      });

      const body = (await response.json()) as ProducerSettingsPayload & { ok?: boolean };
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar configuracion.");
        return;
      }

      setOrganizationName(body.data?.organization?.name ?? organizationName);
      setOrganizationSlug(body.data?.organization?.slug ?? organizationSlug);
      setOrganizationType(body.data?.organization?.type ?? organizationType);
      setSummary({
        activeMembers: body.data?.summary?.activeMembers ?? summary.activeMembers,
        accessibleProjects: body.data?.summary?.accessibleProjects ?? summary.accessibleProjects,
        pendingDocuments: body.data?.summary?.pendingDocuments ?? summary.pendingDocuments,
        rejectedDocuments: body.data?.summary?.rejectedDocuments ?? summary.rejectedDocuments,
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
            <CardTitle className="text-base">Documentos pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : summary.pendingDocuments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentos rechazados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : summary.rejectedDocuments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Configuracion del tenant productor para operacion y gobierno interno.</CardDescription>
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
            <Input id="organizationType" value={organizationType || "producer"} readOnly />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSave} disabled={!canEditOrganization || saving}>
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

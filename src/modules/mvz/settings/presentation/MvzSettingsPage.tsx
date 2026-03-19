"use client";

import { useEffect, useState } from "react";
import { useTenantWorkspace } from "@/modules/workspace";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface MvzSettingsPayload {
  data?: {
    organization?: {
      name?: string;
      slug?: string;
    };
    profile?: {
      fullName?: string;
      licenseNumber?: string;
      status?: string;
    };
    summary?: {
      assignedProjects?: number;
      lastAssignedAt?: string | null;
    };
  };
  error?: {
    message?: string;
  };
}

export default function MvzSettingsPage() {
  const workspace = useTenantWorkspace();
  const role = workspace.user?.role ?? "mvz_internal";
  const canEditOrganization = role === "mvz_government";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [assignedProjects, setAssignedProjects] = useState(0);
  const [lastAssignedAt, setLastAssignedAt] = useState<string | null>(null);

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

        const body = (await response.json()) as MvzSettingsPayload & { ok?: boolean };
        if (!response.ok || !body.ok) {
          setErrorMessage(body.error?.message ?? "No fue posible cargar configuracion.");
          return;
        }

        setOrganizationName(body.data?.organization?.name ?? "");
        setFullName(body.data?.profile?.fullName ?? "");
        setLicenseNumber(body.data?.profile?.licenseNumber ?? "");
        setAssignedProjects(body.data?.summary?.assignedProjects ?? 0);
        setLastAssignedAt(body.data?.summary?.lastAssignedAt ?? null);
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
          fullName,
        }),
      });

      const body = (await response.json()) as MvzSettingsPayload & { ok?: boolean };
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar configuracion.");
        return;
      }

      setOrganizationName(body.data?.organization?.name ?? organizationName);
      setFullName(body.data?.profile?.fullName ?? fullName);
      setLicenseNumber(body.data?.profile?.licenseNumber ?? licenseNumber);
      setAssignedProjects(body.data?.summary?.assignedProjects ?? assignedProjects);
      setLastAssignedAt(body.data?.summary?.lastAssignedAt ?? lastAssignedAt);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-sm text-muted-foreground">
          Perfil MVZ, datos del tenant y resumen de asignaciones activas.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranchos asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "-" : assignedProjects}</p>
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
                : lastAssignedAt
                  ? new Date(lastAssignedAt).toLocaleDateString("es-MX")
                  : "Sin registro"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del tenant y perfil</CardTitle>
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
            <Label htmlFor="fullName">Nombre del MVZ</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Licencia profesional</Label>
            <Input id="licenseNumber" value={licenseNumber} readOnly />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

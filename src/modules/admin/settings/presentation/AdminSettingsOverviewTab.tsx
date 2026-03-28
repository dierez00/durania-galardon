"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface AdminSettingsPayload {
  ok?: boolean;
  data?: {
    organization?: {
      id?: string;
      name?: string;
      slug?: string;
      type?: string;
    };
    summary?: {
      activeMembers?: number;
      activeProducers?: number;
      activeMvz?: number;
      activeQuarantines?: number;
      pendingAppointments?: number;
      pendingExports?: number;
    };
  };
  error?: {
    message?: string;
  };
}

interface AdminSettingsOverviewTabProps {
  canManage: boolean;
}

export default function AdminSettingsOverviewTab({
  canManage,
}: Readonly<AdminSettingsOverviewTabProps>) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [payload, setPayload] = useState<AdminSettingsPayload["data"]>();
  const [organizationName, setOrganizationName] = useState("");

  const load = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/admin/settings", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const body = (await response.json()) as AdminSettingsPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible cargar la configuracion.");
        return;
      }

      setPayload(body.data);
      setOrganizationName(body.data?.organization?.name ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ organizationName }),
      });

      const body = (await response.json()) as AdminSettingsPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar la configuracion.");
        return;
      }

      setPayload(body.data);
      setOrganizationName(body.data?.organization?.name ?? organizationName);
    } finally {
      setSaving(false);
    }
  };

  const summaryCards = [
    { label: "Miembros activos", value: payload?.summary?.activeMembers ?? 0 },
    { label: "Productores activos", value: payload?.summary?.activeProducers ?? 0 },
    { label: "MVZ activos", value: payload?.summary?.activeMvz ?? 0 },
    { label: "Cuarentenas activas", value: payload?.summary?.activeQuarantines ?? 0 },
    { label: "Citas pendientes", value: payload?.summary?.pendingAppointments ?? 0 },
    { label: "Exportaciones pendientes", value: payload?.summary?.pendingExports ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-sm">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{loading ? "-" : card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizacion</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Nombre</Label>
            <Input
              id="organizationName"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              disabled={!canManage}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationSlug">Slug</Label>
            <Input id="organizationSlug" value={payload?.organization?.slug ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationType">Tipo</Label>
            <Input id="organizationType" value={payload?.organization?.type ?? ""} readOnly />
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveSettings} disabled={!canManage || saving || !organizationName.trim()}>
              {saving ? "Guardando..." : "Guardar configuracion"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

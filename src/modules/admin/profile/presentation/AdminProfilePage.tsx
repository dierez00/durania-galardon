"use client";

import { useEffect, useState } from "react";
import { dispatchProfileDisplayNameUpdated } from "@/shared/lib/profile-events";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface AdminProfilePayload {
  ok?: boolean;
  data?: {
    account?: {
      displayName?: string;
      email?: string;
      roleLabel?: string;
      tenantName?: string;
      tenantSlug?: string;
      canEditDisplayName?: boolean;
    };
    membership?: {
      status?: string;
      joinedAt?: string | null;
    };
  };
  error?: {
    message?: string;
  };
}

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [payload, setPayload] = useState<AdminProfilePayload["data"]>();
  const [displayName, setDisplayName] = useState("");

  const load = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesión activa.");
        return;
      }

      const response = await fetch("/api/admin/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const body = (await response.json()) as AdminProfilePayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible cargar el perfil.");
        return;
      }

      setPayload(body.data);
      setDisplayName(body.data?.account?.displayName ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveAccount = async () => {
    setSaving(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesión activa.");
        return;
      }

      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ displayName }),
      });

      const body = (await response.json()) as AdminProfilePayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar la cuenta.");
        return;
      }

      setPayload(body.data);
      const nextDisplayName = body.data?.account?.displayName ?? displayName;
      setDisplayName(nextDisplayName);
      dispatchProfileDisplayNameUpdated(nextDisplayName);
    } finally {
      setSaving(false);
    }
  };

  const canEditDisplayName = payload?.account?.canEditDisplayName ?? true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Cuenta administrativa y membresía actual dentro del panel estatal.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rol actual</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{loading ? "-" : payload?.account?.roleLabel ?? "Administrador"}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de membresía</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{loading ? "-" : payload?.membership?.status ?? "unknown"}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alta en el panel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {loading
                ? "-"
                : payload?.membership?.joinedAt
                  ? new Date(payload.membership.joinedAt).toLocaleDateString("es-MX")
                  : "Sin registro"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuenta administrativa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre visible</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              readOnly={!canEditDisplayName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" value={payload?.account?.email ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleLabel">Rol</Label>
            <Input id="roleLabel" value={payload?.account?.roleLabel ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenantName">Organización</Label>
            <Input
              id="tenantName"
              value={
                payload?.account?.tenantName
                  ? `${payload.account.tenantName} (${payload.account.tenantSlug ?? ""})`
                  : ""
              }
              readOnly
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveAccount} disabled={!canEditDisplayName || saving}>
              {saving ? "Guardando..." : "Guardar cuenta"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

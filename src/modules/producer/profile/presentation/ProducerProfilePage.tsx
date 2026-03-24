"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/shared/lib/auth-session";
import { dispatchProfileDisplayNameUpdated } from "@/shared/lib/profile-events";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

interface ProducerProfilePayload {
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
    domainProfile?: {
      fullName?: string;
      curp?: string | null;
      status?: string;
      canEdit?: boolean;
    } | null;
    scope?: {
      totalAccessibleProjects?: number;
      accessibleProjects?: Array<{
        id: string;
        name: string;
        code: string | null;
        status: string;
        accessLevel: string;
        accessStatus: string;
      }>;
    };
  };
  error?: {
    message?: string;
  };
}

export default function ProducerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [accountSaving, setAccountSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [payload, setPayload] = useState<ProducerProfilePayload["data"]>();
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");

  const load = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesión activa.");
        return;
      }

      const response = await fetch("/api/producer/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const body = (await response.json()) as ProducerProfilePayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible cargar el perfil.");
        return;
      }

      setPayload(body.data);
      setDisplayName(body.data?.account?.displayName ?? "");
      setFullName(body.data?.domainProfile?.fullName ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveAccount = async () => {
    setAccountSaving(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesión activa.");
        return;
      }

      const response = await fetch("/api/producer/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ displayName }),
      });

      const body = (await response.json()) as ProducerProfilePayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar la cuenta.");
        return;
      }

      setPayload(body.data);
      const nextDisplayName = body.data?.account?.displayName ?? displayName;
      setDisplayName(nextDisplayName);
      setFullName(body.data?.domainProfile?.fullName ?? fullName);
      dispatchProfileDisplayNameUpdated(nextDisplayName);
    } finally {
      setAccountSaving(false);
    }
  };

  const saveDomainProfile = async () => {
    setProfileSaving(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesión activa.");
        return;
      }

      const response = await fetch("/api/producer/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fullName }),
      });

      const body = (await response.json()) as ProducerProfilePayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar la ficha.");
        return;
      }

      setPayload(body.data);
      const nextDisplayName = body.data?.account?.displayName ?? displayName;
      setDisplayName(nextDisplayName);
      setFullName(body.data?.domainProfile?.fullName ?? fullName);
      dispatchProfileDisplayNameUpdated(nextDisplayName);
    } finally {
      setProfileSaving(false);
    }
  };

  const canEditDisplayName = payload?.account?.canEditDisplayName ?? true;
  const canEditDomainProfile = payload?.domainProfile?.canEdit ?? false;
  const accessibleProjects = payload?.scope?.accessibleProjects ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Cuenta personal, ficha del productor y acceso actual dentro de la organización.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">UPPs accesibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "-" : payload?.scope?.totalAccessibleProjects ?? accessibleProjects.length}
            </p>
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
            <CardTitle className="text-base">Alta en la organización</CardTitle>
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
          <CardTitle>Cuenta</CardTitle>
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
            <Button onClick={saveAccount} disabled={!canEditDisplayName || accountSaving}>
              {accountSaving ? "Guardando..." : "Guardar cuenta"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {payload?.domainProfile ? (
        <Card>
          <CardHeader>
            <CardTitle>Ficha del productor</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre del productor</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                readOnly={!canEditDomainProfile}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="curp">CURP</Label>
              <Input id="curp" value={payload.domainProfile.curp ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileStatus">Estado</Label>
              <Input id="profileStatus" value={payload.domainProfile.status ?? ""} readOnly />
            </div>
            <div className="md:col-span-2">
              <Button onClick={saveDomainProfile} disabled={!canEditDomainProfile || profileSaving}>
                {profileSaving ? "Guardando..." : "Guardar ficha"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Alcance actual</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : accessibleProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay UPPs accesibles para este usuario.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UPP</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acceso</TableHead>
                  <TableHead>Estado acceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessibleProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name} {project.code ? `(${project.code})` : ""}
                    </TableCell>
                    <TableCell>{project.status}</TableCell>
                    <TableCell>{project.accessLevel}</TableCell>
                    <TableCell>{project.accessStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

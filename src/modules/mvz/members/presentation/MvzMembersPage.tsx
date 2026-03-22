"use client";

import { useCallback, useEffect, useState } from "react";
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
import { getAccessToken } from "@/shared/lib/auth-session";

interface MvzMemberRow {
  id: string;
  userId: string;
  email: string;
  membershipStatus: string;
  roleKey: string | null;
  roleName: string | null;
  joinedAt: string;
}

interface MvzMembersPageProps {
  title?: string;
  description?: string;
}

const MEMBERSHIP_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
};

export default function MvzMembersPage({
  title = "Equipo MVZ",
  description = "Gestion de miembros y roles operativos del tenant MVZ.",
}: MvzMembersPageProps) {
  const [rows, setRows] = useState<MvzMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState<"mvz_government" | "mvz_internal">("mvz_internal");
  const [submitting, setSubmitting] = useState(false);
  const [updatingMembershipId, setUpdatingMembershipId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/mvz/members", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar el equipo MVZ.");
      setLoading(false);
      return;
    }

    setRows(body.data.members ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const createMember = async () => {
    if (!email.trim()) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/mvz/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email: email.trim(), roleKey }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible registrar el miembro MVZ.");
        return;
      }

      setEmail("");
      setRoleKey("mvz_internal");
      await loadRows();
    } finally {
      setSubmitting(false);
    }
  };

  const updateMember = async (
    membershipId: string,
    payload: { status?: "active" | "inactive" | "suspended"; roleKey?: "mvz_government" | "mvz_internal" }
  ) => {
    setUpdatingMembershipId(membershipId);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/mvz/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ membershipId, ...payload }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible actualizar el miembro MVZ.");
        return;
      }

      await loadRows();
    } finally {
      setUpdatingMembershipId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar miembro existente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Correo del miembro</Label>
              <Input
                id="email"
                type="email"
                value={email}
                placeholder="mvz@ejemplo.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="flex gap-2">
                {([
                  { key: "mvz_government", label: "MVZ Gobierno" },
                  { key: "mvz_internal", label: "MVZ Interno" },
                ] as const).map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setRoleKey(option.key)}
                    className={[
                      "rounded border px-3 py-1 text-sm transition",
                      roleKey === option.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={createMember} disabled={!email.trim() || submitting}>
            {submitting ? "Agregando..." : "Agregar miembro"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipo actual</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay miembros adicionales registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isBusy = updatingMembershipId === row.id;
                  const nextStatus = row.membershipStatus === "active" ? "suspended" : "active";
                  const nextRoleKey =
                    row.roleKey === "mvz_government" ? "mvz_internal" : "mvz_government";

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.email}</TableCell>
                      <TableCell>{row.roleName ?? row.roleKey ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={MEMBERSHIP_VARIANT[row.membershipStatus] ?? "secondary"}>
                          {row.membershipStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.joinedAt).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMember(row.id, { roleKey: nextRoleKey })}
                            disabled={isBusy}
                          >
                            {row.roleKey === "mvz_government" ? "Hacer interno" : "Hacer gobierno"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMember(row.id, { status: nextStatus })}
                            disabled={isBusy}
                          >
                            {row.membershipStatus === "active" ? "Suspender" : "Reactivar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

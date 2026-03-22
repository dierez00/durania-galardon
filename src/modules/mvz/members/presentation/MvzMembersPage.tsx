"use client";

import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

interface MvzMemberRow {
  id: string;
  userId: string;
  email: string;
  membershipStatus: string;
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
  isSystemRole: boolean;
  joinedAt: string;
}

interface AvailableRole {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
}

interface MvzMembersPayload {
  ok?: boolean;
  data?: {
    members?: MvzMemberRow[];
    availableRoles?: AvailableRole[];
  };
  error?: {
    message?: string;
  };
}

interface MvzMembersPageProps {
  title?: string;
  description?: string;
  canManage?: boolean;
}

const MEMBERSHIP_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
};

export default function MvzMembersPage({
  title = "Equipo MVZ",
  description = "Gestion de miembros y roles operativos del tenant MVZ.",
  canManage = true,
}: MvzMembersPageProps) {
  const [rows, setRows] = useState<MvzMemberRow[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
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

    const body = (await response.json()) as MvzMembersPayload;
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar el equipo MVZ.");
      setLoading(false);
      return;
    }

    setRows(body.data?.members ?? []);
    setAvailableRoles(body.data?.availableRoles ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (roleId || availableRoles.length === 0) {
      return;
    }

    const defaultRole = availableRoles.find((role) => role.key === "mvz_internal") ?? availableRoles[0];
    setRoleId(defaultRole?.id ?? "");
  }, [availableRoles, roleId]);

  const createMember = async () => {
    if (!email.trim() || !canManage) {
      return;
    }

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
        body: JSON.stringify({ email: email.trim(), roleId: roleId || undefined }),
      });

      const body = (await response.json()) as MvzMembersPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible registrar el miembro MVZ.");
        return;
      }

      setEmail("");
      setRoleId(availableRoles.find((role) => role.key === "mvz_internal")?.id ?? roleId);
      await loadRows();
    } finally {
      setSubmitting(false);
    }
  };

  const updateMember = async (
    membershipId: string,
    payload: { status?: "active" | "inactive" | "suspended"; roleId?: string }
  ) => {
    if (!canManage) {
      return;
    }

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

      const body = (await response.json()) as MvzMembersPayload;
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

      {canManage ? (
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
                <Select value={roleId || undefined} onValueChange={setRoleId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={createMember} disabled={!email.trim() || !roleId || submitting}>
              {submitting ? "Agregando..." : "Agregar miembro"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{row.roleName ?? row.roleKey ?? "-"}</span>
                          {row.isSystemRole ? <Badge variant="outline">Base</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={MEMBERSHIP_VARIANT[row.membershipStatus] ?? "secondary"}>
                          {row.membershipStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.joinedAt).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex justify-end gap-2">
                            <Select
                              value={row.roleId ?? undefined}
                              onValueChange={(nextRoleId) => updateMember(row.id, { roleId: nextRoleId })}
                              disabled={isBusy}
                            >
                              <SelectTrigger className="w-44">
                                <SelectValue placeholder="Rol" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateMember(row.id, { status: nextStatus })}
                              disabled={isBusy}
                            >
                              {row.membershipStatus === "active" ? "Suspender" : "Reactivar"}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Solo lectura</span>
                        )}
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

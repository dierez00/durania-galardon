"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MailPlus } from "lucide-react";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { useProducerUppContext } from "@/modules/producer/ranchos/presentation";

interface EmployeeRow {
  id: string;
  userId: string;
  email: string;
  profileStatus?: string;
  membershipStatus: string;
  accessLifecycleStatus?: "invitation_sent" | "pending" | "active" | "offboarded";
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
  isSystemRole: boolean;
  uppAccess: Array<{ uppId: string; accessLevel: string; status: string }>;
  joinedAt: string;
}

interface AvailableRole {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
}

interface UppOption {
  id: string;
  name: string;
  uppCode: string | null;
}

interface ProducerEmployeesPayload {
  ok?: boolean;
  data?: {
    employees?: EmployeeRow[];
    availableRoles?: AvailableRole[];
    membershipId?: string;
    userId?: string;
    email?: string;
    invitationSent?: boolean;
  };
  error?: {
    message?: string;
  };
}

interface ProducerSettingsRanchosPayload {
  ok?: boolean;
  data?: {
    upps?: Array<{
      id: string;
      name: string;
      uppCode: string | null;
    }>;
  };
}

const ACCESS_LEVEL_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  editor: "secondary",
  viewer: "outline",
};

const MEMBERSHIP_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
};

const ACCESS_LIFECYCLE_META: Record<
  NonNullable<EmployeeRow["accessLifecycleStatus"]>,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  invitation_sent: { label: "Invitacion enviada", variant: "outline" },
  pending: { label: "Pendiente", variant: "secondary" },
  active: { label: "Activo", variant: "default" },
  offboarded: { label: "Dado de baja", variant: "destructive" },
};

interface ProducerEmpleadosPageProps {
  title?: string;
  description?: string;
  canManage?: boolean;
}

function mapWorkspaceUpps(
  upps: Array<{
    id: string;
    name: string;
    upp_code: string | null;
  }>
): UppOption[] {
  return upps.map((upp) => ({
    id: upp.id,
    name: upp.name,
    uppCode: upp.upp_code,
  }));
}

export default function ProducerEmpleadosPage({
  title = "Empleados",
  description = "Gestion de membresias y accesos UPP del personal.",
  canManage = true,
}: ProducerEmpleadosPageProps) {
  const { upps: workspaceUpps } = useProducerUppContext();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [availableUpps, setAvailableUpps] = useState<UppOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [selectedUppIds, setSelectedUppIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [updatingMembershipId, setUpdatingMembershipId] = useState<string | null>(null);

  const uppOptions = useMemo(() => {
    if (availableUpps.length > 0) {
      return availableUpps;
    }

    return mapWorkspaceUpps(workspaceUpps);
  }, [availableUpps, workspaceUpps]);

  useEffect(() => {
    if (workspaceUpps.length === 0) {
      return;
    }

    setAvailableUpps(mapWorkspaceUpps(workspaceUpps));
  }, [workspaceUpps]);

  const loadUppOptions = useCallback(
    async (accessToken: string) => {
      const ranchosResponse = await fetch("/api/producer/settings/ranchos", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!ranchosResponse.ok) {
        if (workspaceUpps.length === 0) {
          setAvailableUpps([]);
        }
        return;
      }

      const ranchosBody = (await ranchosResponse.json()) as ProducerSettingsRanchosPayload;
      const nextUpps =
        ranchosBody.ok && ranchosBody.data?.upps
          ? ranchosBody.data.upps.map((upp) => ({
              id: upp.id,
              name: upp.name,
              uppCode: upp.uppCode,
            }))
          : [];

      setAvailableUpps(nextUpps.length > 0 ? nextUpps : mapWorkspaceUpps(workspaceUpps));
    },
    [workspaceUpps]
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/producer/employees", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    const body = (await response.json()) as ProducerEmployeesPayload;
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar empleados.");
      setLoading(false);
      return;
    }

    setRows(body.data?.employees ?? []);
    setAvailableRoles(body.data?.availableRoles ?? []);
    await loadUppOptions(accessToken);

    setLoading(false);
  }, [loadUppOptions]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (roleId || availableRoles.length === 0) {
      return;
    }

    const defaultRole = availableRoles.find((role) => role.key === "employee") ?? availableRoles[0];
    setRoleId(defaultRole?.id ?? "");
  }, [availableRoles, roleId]);

  const toggleUpp = (uppId: string) => {
    setSelectedUppIds((current) =>
      current.includes(uppId) ? current.filter((id) => id !== uppId) : [...current, uppId]
    );
  };

  const createEmployee = async () => {
    if (!email.trim() || !canManage) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/producer/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          email: email.trim(),
          roleId: roleId || undefined,
          uppAccess: selectedUppIds.map((uppId) => ({
            uppId,
            accessLevel: "editor" as const,
          })),
        }),
      });

      const body = (await response.json()) as ProducerEmployeesPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible registrar empleado.");
        return;
      }

      setEmail("");
      setRoleId(availableRoles.find((role) => role.key === "employee")?.id ?? roleId);
      setSelectedUppIds([]);
      setSuccessMessage(
        body.data?.invitationSent
          ? `Invitacion enviada a ${body.data.email ?? email.trim()}. El empleado podra crear su contrasena desde el correo recibido.`
          : `La cuenta ${body.data?.email ?? email.trim()} ya existia y fue asignada al tenant correctamente.`
      );
      await loadRows();
    } finally {
      setSubmitting(false);
    }
  };

  const updateEmployee = async (
    membershipId: string,
    payload: {
      status?: "active" | "inactive" | "suspended";
      roleId?: string;
    }
  ) => {
    if (!canManage) {
      return;
    }

    setUpdatingMembershipId(membershipId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/producer/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ membershipId, ...payload }),
      });

      const body = (await response.json()) as ProducerEmployeesPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible actualizar el empleado.");
        return;
      }

      await loadRows();
    } finally {
      setUpdatingMembershipId(null);
    }
  };

  const resendInvite = async (row: EmployeeRow) => {
    if (!canManage) {
      return;
    }

    setUpdatingMembershipId(row.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/producer/employees/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ membershipId: row.id }),
      });

      const body = (await response.json()) as ProducerEmployeesPayload & {
        data?: {
          email?: string;
          deliveryType?: "invite" | "recovery";
        };
      };

      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible reenviar la invitacion.");
        return;
      }

      setSuccessMessage(
        body.data?.deliveryType === "recovery"
          ? `Enlace de acceso reenviado a ${body.data.email ?? row.email}.`
          : `Invitacion reenviada a ${body.data?.email ?? row.email}.`
      );
      await loadRows();
    } finally {
      setUpdatingMembershipId(null);
    }
  };

  const uppName = (uppId: string) =>
    uppOptions.find((upp) => upp.id === uppId)?.name ?? uppId.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Agregar o invitar empleado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Correo del empleado</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="empleado@ejemplo.com"
                  onChange={(event) => setEmail(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Si el correo ya existe, se asignara al tenant. Si no existe, enviaremos una invitacion.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Rol dentro del panel</Label>
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
                <p className="text-xs text-muted-foreground">
                  El rol define las acciones disponibles en el panel. El acceso operativo dentro de los ranchos asignados se crea automaticamente.
                </p>
              </div>
            </div>

            {uppOptions.length > 0 ? (
              <div className="space-y-2">
                <Label>Ranchos asignados</Label>
                <div className="flex flex-wrap gap-2">
                  {uppOptions.map((upp) => (
                    <button
                      key={upp.id}
                      type="button"
                      onClick={() => toggleUpp(upp.id)}
                      className={[
                        "rounded border px-3 py-1 text-sm transition",
                        selectedUppIds.includes(upp.id)
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-border hover:border-primary/50",
                      ].join(" ")}
                    >
                      {upp.name} {upp.uppCode ? `(${upp.uppCode})` : ""}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Los ranchos seleccionados se asignan con acceso operativo inicial. Si necesitas ajustar niveles finos, puedes hacerlo despues en Ranchos y asignaciones.
                </p>
              </div>
            ) : null}

            <Button onClick={createEmployee} disabled={!email.trim() || !roleId || submitting}>
              {submitting ? "Procesando..." : "Agregar o invitar"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Empleados actuales</CardTitle>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <Alert variant="success" className="mb-3">
              <AlertTitle>Operacion completada</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay empleados registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Acceso</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acceso a UPPs</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isBusy = updatingMembershipId === row.id;
                  const canResendInvite =
                    row.accessLifecycleStatus === "invitation_sent" || row.accessLifecycleStatus === "pending";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ACCESS_LIFECYCLE_META[row.accessLifecycleStatus ?? "active"]?.variant ?? "secondary"
                          }
                        >
                          {ACCESS_LIFECYCLE_META[row.accessLifecycleStatus ?? "active"]?.label ?? "Activo"}
                        </Badge>
                      </TableCell>
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
                      <TableCell>
                        {row.uppAccess.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Sin acceso</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.uppAccess.map((access) => (
                              <Badge
                                key={`${row.id}-${access.uppId}`}
                                variant={ACCESS_LEVEL_VARIANT[access.accessLevel] ?? "outline"}
                                className="text-xs"
                              >
                                {uppName(access.uppId)} / {access.accessLevel}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.joinedAt).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex justify-end gap-2">
                            {canResendInvite ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => resendInvite(row)}
                                    disabled={isBusy}
                                    aria-label={`Reenviar invitacion a ${row.email}`}
                                  >
                                    <MailPlus className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reenviar invitacion</TooltipContent>
                              </Tooltip>
                            ) : null}
                            <Select
                              value={row.roleId ?? undefined}
                              onValueChange={(nextRoleId) => updateEmployee(row.id, { roleId: nextRoleId })}
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
                              onClick={() =>
                                updateEmployee(row.id, {
                                  status: row.membershipStatus === "active" ? "suspended" : "active",
                                })
                              }
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

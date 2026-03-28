"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MailPlus, RotateCcw, SquarePen } from "lucide-react";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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
  joinedAt: string;
}

interface AvailableRole {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  memberCount?: number;
}

interface AdminEmployeesPayload {
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

const ACCESS_LIFECYCLE_META: Record<
  NonNullable<EmployeeRow["accessLifecycleStatus"]>,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  invitation_sent: { label: "Invitacion enviada", variant: "outline" },
  pending: { label: "Pendiente", variant: "secondary" },
  active: { label: "Activo", variant: "default" },
  offboarded: { label: "Dado de baja", variant: "destructive" },
};

const MEMBERSHIP_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Activo", variant: "default" },
  inactive: { label: "Inactivo", variant: "secondary" },
  suspended: { label: "Suspendido", variant: "destructive" },
};

interface AdminEmpleadosPageProps {
  title?: string;
  description?: string;
  canManage?: boolean;
}

export default function AdminEmpleadosPage({
  title = "Empleados",
  description = "Invita personal administrativo, asigna su rol y sigue su onboarding desde el mismo panel.",
  canManage = true,
}: AdminEmpleadosPageProps) {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingMembershipId, setUpdatingMembershipId] = useState<string | null>(null);
  const [resendingMembershipId, setResendingMembershipId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<EmployeeRow | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "suspended">("active");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/employees", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    const body = (await response.json()) as AdminEmployeesPayload;
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar empleados.");
      setLoading(false);
      return;
    }

    setRows(body.data?.employees ?? []);
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

    setRoleId(availableRoles[0]?.id ?? "");
  }, [availableRoles, roleId]);

  const roleOptions = useMemo(
    () =>
      [...availableRoles].sort((left, right) => {
        if (left.isSystem !== right.isSystem) {
          return left.isSystem ? -1 : 1;
        }

        return left.name.localeCompare(right.name, "es-MX");
      }),
    [availableRoles]
  );

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

      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          roleId: roleId || undefined,
        }),
      });

      const body = (await response.json()) as AdminEmployeesPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible registrar a la persona.");
        return;
      }

      setEmail("");
      setRoleId(roleOptions[0]?.id ?? "");
      setSuccessMessage(
        body.data?.invitationSent
          ? `Se envio una invitacion a ${body.data.email ?? email.trim()}.`
          : `${body.data?.email ?? email.trim()} ya tenia cuenta y quedo agregado al panel.`
      );
      await loadRows();
    } finally {
      setSubmitting(false);
    }
  };

  const updateEmployee = async (membershipId: string, payload: {
    status?: "active" | "inactive" | "suspended";
    roleId?: string;
  }) => {
    if (!canManage) {
      return false;
    }

    setUpdatingMembershipId(membershipId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return false;
      }

      const response = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ membershipId, ...payload }),
      });

      const body = (await response.json()) as AdminEmployeesPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible actualizar a la persona.");
        return false;
      }

      setSuccessMessage("Los cambios del empleado se guardaron correctamente.");
      await loadRows();
      return true;
    } finally {
      setUpdatingMembershipId(null);
    }
  };

  const resendInvite = async (row: EmployeeRow) => {
    if (!canManage) {
      return;
    }

    setResendingMembershipId(row.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/admin/employees/resend-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ membershipId: row.id }),
      });

      const body = (await response.json()) as AdminEmployeesPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible reenviar la invitacion.");
        return;
      }

      setSuccessMessage(`Se reenvio el acceso a ${row.email}.`);
      await loadRows();
    } finally {
      setResendingMembershipId(null);
    }
  };

  const openEditDialog = (row: EmployeeRow) => {
    setEditingRow(row);
    setEditRoleId(row.roleId ?? roleOptions[0]?.id ?? "");
    setEditStatus((row.membershipStatus as "active" | "inactive" | "suspended") ?? "active");
  };

  const saveEdit = async () => {
    if (!editingRow) {
      return;
    }

    const saved = await updateEmployee(editingRow.id, {
      roleId: editRoleId || undefined,
      status: editStatus,
    });

    if (saved) {
      setEditingRow(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Invitar empleado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label htmlFor="employeeEmail">Correo</Label>
            <Input
              id="employeeEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="persona@empresa.com"
              disabled={!canManage}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employeeRole">Rol</Label>
            <Select value={roleId} onValueChange={setRoleId} disabled={!canManage || roleOptions.length === 0}>
              <SelectTrigger id="employeeRole">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={createEmployee} disabled={submitting || !email.trim() || !canManage}>
              <MailPlus className="size-4" />
              {submitting ? "Enviando..." : "Invitar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipo administrativo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando empleados...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavia no hay empleados adicionales registrados en este panel.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <span>{row.roleName ?? "Sin rol"}</span>
                        <Badge variant={row.isSystemRole ? "secondary" : "outline"}>
                          {row.isSystemRole ? "Base" : "Personalizado"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.accessLifecycleStatus ? (
                        <Badge variant={ACCESS_LIFECYCLE_META[row.accessLifecycleStatus].variant}>
                          {ACCESS_LIFECYCLE_META[row.accessLifecycleStatus].label}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={MEMBERSHIP_META[row.membershipStatus]?.variant ?? "secondary"}>
                        {MEMBERSHIP_META[row.membershipStatus]?.label ?? row.membershipStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.joinedAt).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {canManage ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(row)}
                            disabled={updatingMembershipId === row.id}
                          >
                            <SquarePen className="size-4" />
                            Editar
                          </Button>
                        ) : null}
                        {canManage &&
                        (row.accessLifecycleStatus === "invitation_sent" ||
                          row.accessLifecycleStatus === "pending") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void resendInvite(row)}
                            disabled={resendingMembershipId === row.id}
                          >
                            <RotateCcw className="size-4" />
                            {resendingMembershipId === row.id ? "Reenviando..." : "Reenviar acceso"}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingRow !== null} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar empleado</DialogTitle>
            <DialogDescription>
              Ajusta el rol asignado y el estado de acceso del empleado seleccionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editRole">Rol</Label>
              <Select value={editRoleId} onValueChange={setEditRoleId} disabled={!canManage}>
                <SelectTrigger id="editRole">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStatus">Estado</Label>
              <Select
                value={editStatus}
                onValueChange={(value) => setEditStatus(value as "active" | "inactive" | "suspended")}
                disabled={!canManage}
              >
                <SelectTrigger id="editStatus">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="suspended">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)} disabled={updatingMembershipId !== null}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={!canManage || updatingMembershipId !== null}>
              {updatingMembershipId ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

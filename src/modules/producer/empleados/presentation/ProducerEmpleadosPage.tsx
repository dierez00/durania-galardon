"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MailPlus, SquarePen } from "lucide-react";
import { getAccessToken } from "@/shared/lib/auth-session";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
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
  mvzProfile?: {
    fullName: string;
    licenseNumber: string;
    status: string;
  } | null;
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

type EmployeeAccessLevel = "viewer" | "editor" | "owner";

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

const ACCESS_LIFECYCLE_META: Record<
  NonNullable<EmployeeRow["accessLifecycleStatus"]>,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  invitation_sent: { label: "Invitación enviada", variant: "outline" },
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
  title = "Equipo",
  description = "Da de alta personal operativo y MVZ interno, asigna su rol y define a que ranchos puede entrar. El MVZ interno accede por el panel MVZ.",
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
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [selectedUppIds, setSelectedUppIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [updatingMembershipId, setUpdatingMembershipId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<EmployeeRow | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "suspended">("active");
  const [editFullName, setEditFullName] = useState("");
  const [editLicenseNumber, setEditLicenseNumber] = useState("");
  const [editSelectedUppIds, setEditSelectedUppIds] = useState<string[]>([]);

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
      setErrorMessage("No existe sesión activa.");
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

  const roleOptions = useMemo(() => {
    const roleOrder = ["employee", "mvz_internal", "producer_viewer", "producer"];

    return [...availableRoles].sort((left, right) => {
      const leftIndex = roleOrder.indexOf(left.key);
      const rightIndex = roleOrder.indexOf(right.key);
      const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

      if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
      }

      return left.name.localeCompare(right.name, "es-MX");
    });
  }, [availableRoles]);

  const selectedCreateRole = useMemo(
    () => roleOptions.find((role) => role.id === roleId) ?? null,
    [roleId, roleOptions]
  );

  const selectedEditRole = useMemo(
    () => roleOptions.find((role) => role.id === editRoleId) ?? null,
    [editRoleId, roleOptions]
  );

  const isCreateMvzInternal = selectedCreateRole?.key === "mvz_internal";
  const isEditMvzInternal = selectedEditRole?.key === "mvz_internal";

  const toggleUpp = (uppId: string) => {
    setSelectedUppIds((current) =>
      current.includes(uppId) ? current.filter((id) => id !== uppId) : [...current, uppId]
    );
  };

  const toggleEditUpp = (uppId: string) => {
    setEditSelectedUppIds((current) =>
      current.includes(uppId) ? current.filter((id) => id !== uppId) : [...current, uppId]
    );
  };

  const createEmployee = async () => {
    if (!email.trim() || !canManage) {
      return;
    }

    if (isCreateMvzInternal && (!fullName.trim() || !licenseNumber.trim())) {
      setErrorMessage("Para dar de alta un MVZ interno debes capturar nombre profesional y cédula/licencia.");
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesión activa.");
        return;
      }

      const response = await fetch("/api/producer/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          email: email.trim(),
          roleId: roleId || undefined,
          fullName: fullName.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          uppAccess: selectedUppIds.map((uppId) => ({
            uppId,
            accessLevel: "editor" as const,
          })),
        }),
      });

      const body = (await response.json()) as ProducerEmployeesPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible registrar a la persona.");
        return;
      }

      setEmail("");
      setRoleId(availableRoles.find((role) => role.key === "employee")?.id ?? roleId);
      setFullName("");
      setLicenseNumber("");
      setSelectedUppIds([]);
      setSuccessMessage(
        body.data?.invitationSent
          ? `Se envió una invitación a ${body.data.email ?? email.trim()}. La persona podrá crear su contraseña desde el correo recibido.`
          : `${body.data?.email ?? email.trim()} ya tenía cuenta y quedó agregada al equipo correctamente.`
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
      fullName?: string;
      licenseNumber?: string;
      uppAccess?: Array<{
        uppId: string;
        accessLevel: EmployeeAccessLevel;
      }>;
    }
  ): Promise<boolean> => {
    if (!canManage) {
      return false;
    }

    setUpdatingMembershipId(membershipId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesión activa.");
        return false;
      }

      const response = await fetch("/api/producer/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ membershipId, ...payload }),
      });

      const body = (await response.json()) as ProducerEmployeesPayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible actualizar a la persona.");
        return false;
      }

      if (payload.uppAccess) {
        setSuccessMessage("Los datos de la persona se actualizaron correctamente.");
      } else if (payload.roleId) {
        setSuccessMessage("El rol se actualizó correctamente.");
      } else if (payload.status) {
        setSuccessMessage("El estado del acceso se actualizó correctamente.");
      }

      await loadRows();
      return true;
    } finally {
      setUpdatingMembershipId(null);
    }
  };

  const openEditDialog = (row: EmployeeRow) => {
    setEditingRow(row);
    setEditRoleId(row.roleId ?? roleOptions.find((role) => role.key === "employee")?.id ?? "");
    setEditStatus((row.membershipStatus as "active" | "inactive" | "suspended") ?? "active");
    setEditFullName(row.mvzProfile?.fullName ?? "");
    setEditLicenseNumber(row.mvzProfile?.licenseNumber ?? "");
    setEditSelectedUppIds(row.uppAccess.map((access) => access.uppId));
  };

  const closeEditDialog = () => {
    if (updatingMembershipId) {
      return;
    }

    setEditingRow(null);
    setEditRoleId("");
    setEditStatus("active");
    setEditFullName("");
    setEditLicenseNumber("");
    setEditSelectedUppIds([]);
  };

  const saveEmployeeEdit = async () => {
    if (!editingRow || !editRoleId) {
      return;
    }

    if (isEditMvzInternal && (!editFullName.trim() || !editLicenseNumber.trim())) {
      setErrorMessage("Para guardar un MVZ interno debes capturar nombre profesional y cédula/licencia.");
      setSuccessMessage("");
      return;
    }

    const currentAccessByUppId = new Map(
      editingRow.uppAccess.map((access) => [access.uppId, access.accessLevel as EmployeeAccessLevel])
    );

    const updated = await updateEmployee(editingRow.id, {
      roleId: editRoleId,
      status: editStatus,
      fullName: editFullName.trim() || undefined,
      licenseNumber: editLicenseNumber.trim() || undefined,
      uppAccess: editSelectedUppIds.map((uppId) => ({
        uppId,
        accessLevel: currentAccessByUppId.get(uppId) ?? "editor",
      })),
    });

    if (updated) {
      closeEditDialog();
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
        setErrorMessage("No existe sesión activa.");
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
        setErrorMessage(body.error?.message ?? "No fue posible reenviar la invitación.");
        return;
      }

      setSuccessMessage(
        body.data?.deliveryType === "recovery"
          ? `Enlace de acceso reenviado a ${body.data.email ?? row.email}.`
          : `Invitación reenviada a ${body.data?.email ?? row.email}.`
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
            <CardTitle>Dar de alta persona del equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Correo de la persona</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="persona@ejemplo.com"
                  onChange={(event) => setEmail(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Si el correo ya existe, se agregara al equipo. Si todavia no existe, enviaremos una invitacion.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Rol dentro del panel</Label>
                <Select value={roleId || undefined} onValueChange={setRoleId}>
                  <SelectTrigger className="w-full">
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
                <p className="text-xs text-muted-foreground">
                  Puedes registrar personal del equipo o un MVZ interno. Cuando eliges MVZ interno, la persona entra por el panel MVZ y trabaja solo con los ranchos asignados.
                </p>
              </div>
            </div>

            {isCreateMvzInternal ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre profesional</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    placeholder="Dra. Maria Lopez Hernandez"
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Cédula / licencia</Label>
                  <Input
                    id="licenseNumber"
                    value={licenseNumber}
                    placeholder="ABC123456"
                    onChange={(event) => setLicenseNumber(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

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
                  Los ranchos seleccionados se asignan con acceso inicial. En MVZ interno, estos ranchos son los que aparecen en su panel MVZ.
                </p>
              </div>
            ) : null}

            <Button
              onClick={createEmployee}
              disabled={
                !email.trim() ||
                !roleId ||
                submitting ||
                (isCreateMvzInternal && (!fullName.trim() || !licenseNumber.trim()))
              }
            >
              {submitting ? "Procesando..." : "Dar de alta"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Personas del equipo</CardTitle>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <Alert variant="success" className="mb-3">
              <AlertTitle>Acción completada</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay personas registradas en este equipo.
            </p>
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
                  const membershipMeta = MEMBERSHIP_META[row.membershipStatus] ?? {
                    label: row.membershipStatus,
                    variant: "secondary" as const,
                  };
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
                        <Badge variant={membershipMeta.variant}>{membershipMeta.label}</Badge>
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
                                    aria-label={`Reenviar invitación a ${row.email}`}
                                  >
                                    <MailPlus className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reenviar invitación</TooltipContent>
                              </Tooltip>
                            ) : null}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(row)}
                              disabled={isBusy}
                            >
                              <SquarePen className="size-4" />
                              Editar
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

      <Dialog open={editingRow !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar persona del equipo</DialogTitle>
            <DialogDescription>
              Actualiza el rol, el estado de acceso y los ranchos asignados de {editingRow?.email ?? "esta persona"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Rol dentro del panel</Label>
                <Select value={editRoleId || undefined} onValueChange={setEditRoleId}>
                  <SelectTrigger className="w-full">
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
                <Label>Estado del acceso</Label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => setEditStatus(value as "active" | "inactive" | "suspended")}
                >
                  <SelectTrigger className="w-full">
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

            {isEditMvzInternal ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editFullName">Nombre profesional</Label>
                  <Input
                    id="editFullName"
                    value={editFullName}
                    placeholder="Dra. Maria Lopez Hernandez"
                    onChange={(event) => setEditFullName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLicenseNumber">Cédula / licencia</Label>
                  <Input
                    id="editLicenseNumber"
                    value={editLicenseNumber}
                    placeholder="ABC123456"
                    onChange={(event) => setEditLicenseNumber(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Ranchos asignados</Label>
              {uppOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay ranchos disponibles para asignar.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {uppOptions.map((upp) => (
                    <button
                      key={upp.id}
                      type="button"
                      onClick={() => toggleEditUpp(upp.id)}
                      className={[
                        "rounded border px-3 py-1 text-sm transition",
                        editSelectedUppIds.includes(upp.id)
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-border hover:border-primary/50",
                      ].join(" ")}
                    >
                      {upp.name} {upp.uppCode ? `(${upp.uppCode})` : ""}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Los ranchos que agregues aqui conservan su nivel actual si ya existia. Para MVZ interno, estos ranchos se sincronizan con su panel MVZ.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={Boolean(updatingMembershipId)}>
              Cancelar
            </Button>
            <Button
              onClick={saveEmployeeEdit}
              disabled={
                !editRoleId ||
                Boolean(updatingMembershipId) ||
                (isEditMvzInternal && (!editFullName.trim() || !editLicenseNumber.trim()))
              }
            >
              {updatingMembershipId ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

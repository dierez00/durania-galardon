"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type ProducerAccessLevel = "none" | "viewer" | "editor" | "owner";

interface RanchoAssignedMember {
  membershipId: string;
  userId: string;
  email: string;
  membershipStatus: string;
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
  isSystemRole: boolean;
  accessLevel: "viewer" | "editor" | "owner";
  accessStatus: string;
}

interface RanchoSummary {
  id: string;
  name: string;
  uppCode: string | null;
  status: string;
  herdLimit: number | null;
  hectaresTotal: number | null;
  assignedMembers: RanchoAssignedMember[];
}

interface EmployeeRow {
  id: string;
  email: string;
  membershipStatus: string;
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
  isSystemRole: boolean;
  uppAccess: Array<{ uppId: string; accessLevel: "viewer" | "editor" | "owner"; status: string }>;
}

interface ProducerSettingsRanchosPayload {
  ok?: boolean;
  data?: {
    upps?: RanchoSummary[];
    canViewMemberAccess?: boolean;
    canManageAssignments?: boolean;
  };
  error?: {
    message?: string;
  };
}

interface ProducerEmployeesPayload {
  ok?: boolean;
  data?: {
    employees?: EmployeeRow[];
  };
}

const ACCESS_LEVEL_LABEL: Record<ProducerAccessLevel, string> = {
  none: "Sin acceso",
  viewer: "Lectura",
  editor: "Edicion",
  owner: "Propietario",
};

const ACCESS_LEVEL_VARIANT: Record<ProducerAccessLevel, "default" | "secondary" | "outline"> = {
  none: "outline",
  viewer: "outline",
  editor: "secondary",
  owner: "default",
};

function normalizeEmployeeAccess(upps: RanchoSummary[]) {
  const byMembershipId = new Map<string, EmployeeRow>();

  upps.forEach((upp) => {
    upp.assignedMembers.forEach((member) => {
      const current = byMembershipId.get(member.membershipId) ?? {
        id: member.membershipId,
        email: member.email,
        membershipStatus: member.membershipStatus,
        roleId: member.roleId,
        roleKey: member.roleKey,
        roleName: member.roleName,
        isSystemRole: member.isSystemRole,
        uppAccess: [],
      };

      current.uppAccess.push({
        uppId: upp.id,
        accessLevel: member.accessLevel,
        status: member.accessStatus,
      });
      byMembershipId.set(member.membershipId, current);
    });
  });

  return [...byMembershipId.values()];
}

export default function ProducerSettingsRanchosTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [upps, setUpps] = useState<RanchoSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [canViewMemberAccess, setCanViewMemberAccess] = useState(false);
  const [canManageAssignments, setCanManageAssignments] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [selectedEmployeeLabel, setSelectedEmployeeLabel] = useState("");
  const [draftAccessByUppId, setDraftAccessByUppId] = useState<Record<string, ProducerAccessLevel>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const ranchosResponse = await fetch("/api/producer/settings/ranchos", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const ranchosBody = (await ranchosResponse.json()) as ProducerSettingsRanchosPayload;
      if (!ranchosResponse.ok || !ranchosBody.ok) {
        setErrorMessage(ranchosBody.error?.message ?? "No fue posible cargar ranchos.");
        return;
      }

      const nextUpps = ranchosBody.data?.upps ?? [];
      const nextCanViewMemberAccess = ranchosBody.data?.canViewMemberAccess ?? false;
      const nextCanManageAssignments = ranchosBody.data?.canManageAssignments ?? false;

      setUpps(nextUpps);
      setCanViewMemberAccess(nextCanViewMemberAccess);
      setCanManageAssignments(nextCanManageAssignments);

      if (nextCanViewMemberAccess) {
        const employeesResponse = await fetch("/api/producer/employees", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        if (employeesResponse.ok) {
          const employeesBody = (await employeesResponse.json()) as ProducerEmployeesPayload;
          setEmployees(employeesBody.data?.employees ?? []);
        } else {
          setEmployees(normalizeEmployeeAccess(nextUpps));
        }
      } else {
        setEmployees([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fallbackEmployees = useMemo(() => normalizeEmployeeAccess(upps), [upps]);
  const visibleEmployees = employees.length > 0 ? employees : fallbackEmployees;

  const openAssignmentsDialog = (employee: EmployeeRow) => {
    const nextDraft: Record<string, ProducerAccessLevel> = {};
    upps.forEach((upp) => {
      nextDraft[upp.id] =
        employee.uppAccess.find((access) => access.uppId === upp.id)?.accessLevel ?? "none";
    });

    setSelectedMembershipId(employee.id);
    setSelectedEmployeeLabel(employee.email);
    setDraftAccessByUppId(nextDraft);
    setDialogOpen(true);
  };

  const saveAssignments = async () => {
    if (!selectedMembershipId) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const uppAccess = Object.entries(draftAccessByUppId)
        .filter(([, accessLevel]) => accessLevel !== "none")
        .map(([uppId, accessLevel]) => ({
          uppId,
          accessLevel: accessLevel as Exclude<ProducerAccessLevel, "none">,
        }));

      const response = await fetch("/api/producer/employees", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          membershipId: selectedMembershipId,
          uppAccess,
        }),
      });

      const body = (await response.json()) as ProducerEmployeesPayload & {
        error?: {
          message?: string;
        };
      };
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible actualizar accesos de rancho.");
        return;
      }

      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Ranchos y asignaciones</h2>
        <p className="text-sm text-muted-foreground">
          Consulta la cobertura por UPP y administra que empleados pueden entrar a cada rancho.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando ranchos...</p>
      ) : upps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No hay ranchos accesibles para este tenant productor.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {upps.map((upp) => (
              <Card key={upp.id}>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">
                    {upp.name} {upp.uppCode ? `(${upp.uppCode})` : ""}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Estado: {upp.status || "Sin estado"} | Empleados asignados: {upp.assignedMembers.length}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>Hato maximo: {upp.herdLimit ?? "Sin dato"}</p>
                    <p>Hectareas: {upp.hectaresTotal ?? "Sin dato"}</p>
                  </div>

                  {canViewMemberAccess ? (
                    upp.assignedMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin empleados asignados a este rancho.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {upp.assignedMembers.map((member) => (
                          <Badge
                            key={`${upp.id}-${member.membershipId}`}
                            variant={ACCESS_LEVEL_VARIANT[member.accessLevel] ?? "outline"}
                            className="max-w-full break-all"
                          >
                            {member.email} / {ACCESS_LEVEL_LABEL[member.accessLevel]}
                          </Badge>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Tienes acceso al rancho, pero no al detalle de empleados asignados.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {canViewMemberAccess ? (
            <Card>
              <CardHeader>
                <CardTitle>Asignacion por empleado</CardTitle>
              </CardHeader>
              <CardContent>
                {visibleEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay empleados con accesos registrados a ranchos.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Correo</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Accesos actuales</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{employee.roleName ?? employee.roleKey ?? "-"}</span>
                              {employee.isSystemRole ? <Badge variant="outline">Base</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {employee.uppAccess.length === 0 ? (
                              <span className="text-sm text-muted-foreground">Sin accesos</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {employee.uppAccess.map((access) => {
                                  const upp = upps.find((current) => current.id === access.uppId);
                                  return (
                                    <Badge
                                      key={`${employee.id}-${access.uppId}`}
                                      variant={ACCESS_LEVEL_VARIANT[access.accessLevel] ?? "outline"}
                                      className="text-xs"
                                    >
                                      {upp?.name ?? access.uppId} / {ACCESS_LEVEL_LABEL[access.accessLevel]}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {canManageAssignments ? (
                              <Button variant="outline" size="sm" onClick={() => openAssignmentsDialog(employee)}>
                                Gestionar ranchos
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">Solo lectura</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Asignar ranchos</DialogTitle>
            <DialogDescription>
              Define en que ranchos puede operar {selectedEmployeeLabel} y con que nivel de acceso.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {upps.map((upp) => (
              <div
                key={upp.id}
                className="grid gap-3 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_220px]"
              >
                <div className="space-y-1">
                  <Label>{upp.name}</Label>
                  <p className="text-sm text-muted-foreground">
                    {upp.uppCode ? `${upp.uppCode} | ` : ""}
                    Estado: {upp.status || "Sin estado"}
                  </p>
                </div>
                <Select
                  value={draftAccessByUppId[upp.id] ?? "none"}
                  onValueChange={(value) =>
                    setDraftAccessByUppId((current) => ({
                      ...current,
                      [upp.id]: value as ProducerAccessLevel,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nivel de acceso" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["none", "viewer", "editor", "owner"] as const).map((accessLevel) => (
                      <SelectItem key={accessLevel} value={accessLevel}>
                        {ACCESS_LEVEL_LABEL[accessLevel]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveAssignments} disabled={saving}>
              {saving ? "Guardando..." : "Guardar accesos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

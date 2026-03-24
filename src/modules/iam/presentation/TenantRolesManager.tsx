"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyPlus, ShieldCheck, SquarePen, Trash2 } from "lucide-react";
import { getAccessToken } from "@/shared/lib/auth-session";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
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

interface TenantRolePermissionCatalogItem {
  id: string;
  key: string;
  description: string;
  groupKey: string;
  groupLabel: string;
  action: string;
}

interface TenantRoleSummary {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  memberCount: number;
  permissions: string[];
  isEditable: boolean;
  isCloneable: boolean;
}

interface TenantRolesPayload {
  data?: {
    roles?: TenantRoleSummary[];
    permissionCatalog?: TenantRolePermissionCatalogItem[];
  };
  error?: {
    message?: string;
  };
}

interface TenantRolesManagerProps {
  endpoint: string;
  title: string;
  description: string;
  emptyLabel: string;
  canManage?: boolean;
}

type DialogMode = "create" | "edit" | "clone";

export default function TenantRolesManager({
  endpoint,
  title,
  description,
  emptyLabel,
  canManage = true,
}: TenantRolesManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [roles, setRoles] = useState<TenantRoleSummary[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<TenantRolePermissionCatalogItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [rolePendingDelete, setRolePendingDelete] = useState<TenantRoleSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const body = (await response.json()) as TenantRolesPayload & { ok?: boolean };
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible cargar roles.");
        return;
      }

      setRoles(body.data?.roles ?? []);
      setPermissionCatalog(body.data?.permissionCatalog ?? []);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupedPermissions = useMemo(() => {
    return permissionCatalog.reduce(
      (acc, permission) => {
        const current = acc.get(permission.groupKey) ?? {
          label: permission.groupLabel,
          items: [] as TenantRolePermissionCatalogItem[],
        };
        current.items.push(permission);
        acc.set(permission.groupKey, current);
        return acc;
      },
      new Map<string, { label: string; items: TenantRolePermissionCatalogItem[] }>()
    );
  }, [permissionCatalog]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setSelectedRoleId(null);
    setRoleName("");
    setSelectedPermissionKeys([]);
    setDialogOpen(true);
  };

  const openCloneDialog = (role: TenantRoleSummary) => {
    setDialogMode("clone");
    setSelectedRoleId(role.id);
    setRoleName(`${role.name} copia`);
    setSelectedPermissionKeys(role.permissions);
    setDialogOpen(true);
  };

  const openEditDialog = (role: TenantRoleSummary) => {
    setDialogMode("edit");
    setSelectedRoleId(role.id);
    setRoleName(role.name);
    setSelectedPermissionKeys(role.permissions);
    setDialogOpen(true);
  };

  const togglePermission = (permissionKey: string) => {
    setSelectedPermissionKeys((current) =>
      current.includes(permissionKey)
        ? current.filter((item) => item !== permissionKey)
        : [...current, permissionKey]
    );
  };

  const saveRole = async () => {
    const trimmedName = roleName.trim();
    if (!trimmedName) {
      setErrorMessage("Debe capturar un nombre para el rol.");
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

      const method = dialogMode === "edit" ? "PATCH" : "POST";
      const payload =
        dialogMode === "edit"
          ? {
              roleId: selectedRoleId,
              name: trimmedName,
              permissionKeys: selectedPermissionKeys,
            }
          : {
              name: trimmedName,
              permissionKeys: selectedPermissionKeys,
              cloneFromRoleId: dialogMode === "clone" ? selectedRoleId : null,
            };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as TenantRolesPayload & { ok?: boolean };
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible guardar el rol.");
        return;
      }

      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!rolePendingDelete) {
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

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ roleId: rolePendingDelete.id }),
      });

      const body = (await response.json()) as TenantRolesPayload & { ok?: boolean };
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible eliminar el rol.");
        return;
      }

      setRolePendingDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canManage ? <Button onClick={openCreateDialog}>Crear rol</Button> : null}
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando roles...</p>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{emptyLabel}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{role.key}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant={role.isSystem ? "secondary" : "outline"}>
                      {role.isSystem ? "Base" : "Personalizado"}
                    </Badge>
                    <Badge variant="outline">{role.memberCount} miembros</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage && role.isEditable ? (
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(role)}>
                      <SquarePen className="size-4" />
                      Editar
                    </Button>
                  ) : null}
                  {canManage && role.isCloneable ? (
                    <Button variant="outline" size="sm" onClick={() => openCloneDialog(role)}>
                      <CopyPlus className="size-4" />
                      Clonar
                    </Button>
                  ) : null}
                  {canManage ? (
                    <Button variant="outline" size="sm" onClick={() => setRolePendingDelete(role)}>
                      <Trash2 className="size-4" />
                      Eliminar
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {role.permissions.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Sin permisos asignados.</span>
                  ) : (
                    role.permissions.map((permissionKey) => {
                      const permission = permissionCatalog.find((item) => item.key === permissionKey);
                      return (
                        <Badge key={permissionKey} variant="outline" className="max-w-full break-all">
                          {permission?.description ?? permissionKey}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-3xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit"
                ? "Editar rol"
                : dialogMode === "clone"
                  ? "Clonar rol"
                  : "Crear rol"}
            </DialogTitle>
            <DialogDescription>
              Define el nombre y los permisos de este rol.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="roleName">Nombre del rol</Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="Operador sanitario"
                disabled={!canManage}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Permisos del rol</p>
              </div>

              {[...groupedPermissions.entries()].map(([groupKey, group]) => (
                <Card key={groupKey}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{group.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {group.items.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex items-start gap-3 rounded-md border p-3 transition hover:border-primary/40"
                      >
                        <Checkbox
                          checked={selectedPermissionKeys.includes(permission.key)}
                          onCheckedChange={() => togglePermission(permission.key)}
                          disabled={!canManage}
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{permission.description}</p>
                          <p className="text-xs text-muted-foreground">{permission.key}</p>
                        </div>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveRole} disabled={saving || !canManage}>
              {saving ? "Guardando..." : "Guardar rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={rolePendingDelete !== null} onOpenChange={(open) => !open && setRolePendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol</AlertDialogTitle>
            <AlertDialogDescription>
              {rolePendingDelete
                ? `Se eliminara el rol "${rolePendingDelete.name}". Si el rol aun tiene miembros asignados, la operacion se bloqueara hasta desasignarlos.`
                : "Confirma la eliminacion del rol."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteRole();
              }}
              disabled={saving || !canManage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Eliminando..." : "Eliminar rol"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

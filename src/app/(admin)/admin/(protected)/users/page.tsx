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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";

type RoleKey = "admin" | "mvz" | "producer";
type UserStatus = "active" | "inactive" | "blocked";

interface AdminUser {
  id: string;
  email: string;
  status: UserStatus;
  role: RoleKey | null;
  roleLabel: string;
  fullName: string;
  licenseNumber: string | null;
  createdAt: string;
}

interface UsersApiResponse {
  ok: boolean;
  data?: {
    users: AdminUser[];
  };
  error?: {
    message: string;
  };
}

interface CreateUserApiResponse {
  ok: boolean;
  data?: {
    user: AdminUser;
  };
  error?: {
    message: string;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RoleKey>("producer");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [creating, setCreating] = useState(false);

  const getAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const body = (await response.json()) as UsersApiResponse;
      if (!response.ok || !body.ok || !body.data) {
        setErrorMessage(body.error?.message ?? "No fue posible cargar usuarios.");
        return;
      }

      setUsers(body.data.users);
    } catch {
      setErrorMessage("Error de red al consultar usuarios.");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser = async () => {
    setCreating(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          role,
          licenseNumber: role === "mvz" ? licenseNumber : undefined,
        }),
      });

      const body = (await response.json()) as CreateUserApiResponse;
      if (!response.ok || !body.ok || !body.data) {
        setErrorMessage(body.error?.message ?? "No fue posible crear el usuario.");
        return;
      }

      setEmail("");
      setPassword("");
      setFullName("");
      setLicenseNumber("");
      await loadUsers();
    } catch {
      setErrorMessage("Error de red al crear usuario.");
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        return;
      }

      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as CreateUserApiResponse;
        setErrorMessage(errorBody.error?.message ?? "No fue posible cambiar el estado.");
        return;
      }

      await loadUsers();
    } catch {
      setErrorMessage("Error de red al cambiar estado.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion de usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Alta de usuarios (admin, MVZ, productor) y gestion basica de estado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar nuevo usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nombre del usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@dominio.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena temporal</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={role} onValueChange={(value) => setRole(value as RoleKey)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecciona rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="mvz">MVZ</SelectItem>
                  <SelectItem value="producer">Productor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === "mvz" ? (
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Cedula / licencia MVZ</Label>
              <Input
                id="licenseNumber"
                value={licenseNumber}
                onChange={(event) => setLicenseNumber(event.target.value)}
                placeholder="LIC-MVZ-001"
              />
            </div>
          ) : null}

          <Button
            onClick={createUser}
            disabled={creating || !email || !password || !fullName || (role === "mvz" && !licenseNumber)}
          >
            {creating ? "Creando..." : "Crear usuario"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.roleLabel}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.status === "active"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString("es-MX")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => toggleStatus(user)}>
                          {user.status === "active" ? "Inactivar" : "Activar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

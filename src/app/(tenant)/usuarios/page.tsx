"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  UsersFilters,
  UserList,
  listUsers,
  filterUsersUseCase,
  type UsersFiltersState,
} from "@/modules/usuarios";
import { mockUserRepository } from "@/modules/usuarios/infra/mock/MockUserRepository";

const allUsers = listUsers(mockUserRepository);

export default function UsuariosPage() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<UsersFiltersState>({
    search: "",
    role: "",
    estado: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const filteredUsers = useMemo(
    () => filterUsersUseCase(allUsers, filters),
    [filters]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestion de usuarios del sistema</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input placeholder="Nombre del usuario" />
                </div>
                <div className="space-y-2">
                  <Label>Correo Electronico</Label>
                  <Input type="email" placeholder="correo@siiniga.gob.mx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="mvz">MVZ</SelectItem>
                      <SelectItem value="ventanilla">Ventanilla</SelectItem>
                      <SelectItem value="productor">Productor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contrasena</Label>
                  <Input type="password" placeholder="Contrasena temporal" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => setOpen(false)}>Crear Usuario</Button>
              </div>
            </div>
          </DialogContent>
      </Dialog>

      <UsersFilters
        filters={filters}
        onFiltersChange={setFilters}
        onAddUser={() => setOpen(true)}
      />

      <UserList users={filteredUsers} />
    </div>
  );
}

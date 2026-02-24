"use client";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Pencil, UserCheck, UserX } from "lucide-react";
import type { User } from "@/modules/usuarios/domain/entities/User";
import { UserRolBadge } from "./UserRolBadge";

interface UserListProps {
  users: User[];
  onEdit?: (user: User) => void;
  onToggleEstado?: (user: User) => void;
}

export function UserList({ users, onEdit, onToggleEstado }: UserListProps) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último Acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><UserRolBadge rol={u.rol} /></TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${u.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.ultimo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit?.(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onToggleEstado?.(u)}>
                        {u.estado === "Activo"
                          ? <UserX className="w-4 h-4 text-red-500" />
                          : <UserCheck className="w-4 h-4 text-emerald-600" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

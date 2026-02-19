"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, UserCheck, UserX } from "lucide-react";

const users = [
  { id: 1, nombre: "Dr. Carlos Martinez", email: "carlos@siiniga.gob.mx", rol: "Administrador", estado: "Activo", ultimo: "2024-08-15" },
  { id: 2, nombre: "MVZ. Ana Garcia", email: "ana.garcia@siiniga.gob.mx", rol: "MVZ", estado: "Activo", ultimo: "2024-08-15" },
  { id: 3, nombre: "Maria Lopez", email: "maria.lopez@siiniga.gob.mx", rol: "Ventanilla", estado: "Activo", ultimo: "2024-08-14" },
  { id: 4, nombre: "Juan Perez Ramirez", email: "juan.perez@correo.com", rol: "Productor", estado: "Activo", ultimo: "2024-08-13" },
  { id: 5, nombre: "MVZ. Roberto Diaz", email: "roberto.diaz@siiniga.gob.mx", rol: "MVZ", estado: "Activo", ultimo: "2024-08-12" },
  { id: 6, nombre: "Laura Sanchez", email: "laura.sanchez@siiniga.gob.mx", rol: "Ventanilla", estado: "Inactivo", ultimo: "2024-07-20" },
  { id: 7, nombre: "Pedro Gomez Torres", email: "pedro.gomez@correo.com", rol: "Productor", estado: "Activo", ultimo: "2024-08-11" },
  { id: 8, nombre: "MVZ. Sofia Herrera", email: "sofia.herrera@siiniga.gob.mx", rol: "MVZ", estado: "Activo", ultimo: "2024-08-15" },
];

function rolBadge(rol: string) {
  const colors: Record<string, string> = {
    Administrador: "bg-purple-100 text-purple-700",
    MVZ: "bg-blue-100 text-blue-700",
    Ventanilla: "bg-amber-100 text-amber-700",
    Productor: "bg-emerald-100 text-emerald-700",
  };
  return <Badge className={`${colors[rol] || ""} border-0 hover:opacity-90`}>{rol}</Badge>;
}

export default function UsuariosPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion de usuarios del sistema</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nuevo Usuario</Button>
          </DialogTrigger>
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
      </div>

      {/* Search bar */}
      <Card className="py-4">
        <CardContent className="py-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, correo o rol..." className="pl-9" />
            </div>
            <Select>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por rol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="mvz">MVZ</SelectItem>
                <SelectItem value="ventanilla">Ventanilla</SelectItem>
                <SelectItem value="productor">Productor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ultimo Acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{rolBadge(u.rol)}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${u.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.ultimo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon">
                        {u.estado === "Activo" ? <UserX className="w-4 h-4 text-red-500" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

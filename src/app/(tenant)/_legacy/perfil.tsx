"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { User, Mail, Shield, Key } from "lucide-react";

export default function PerfilPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Informacion personal y configuracion de cuenta</p>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Dr. Carlos Martinez</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                admin@siiniga.gob.mx
              </p>
              <Badge className="bg-purple-100 text-purple-700 border-0 mt-2">Administrador</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input defaultValue="Dr. Carlos Martinez" />
            </div>
            <div className="space-y-2">
              <Label>Correo Electronico</Label>
              <Input defaultValue="admin@siiniga.gob.mx" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input defaultValue="(614) 555-0100" />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input defaultValue="Director Estatal SIINIGA" />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button>Guardar Cambios</Button>
          </div>
        </CardContent>
      </Card>

      {/* Role info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Rol y Permisos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">Rol Asignado</Label>
              <p className="font-medium mt-1">Administrador</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Ultimo Acceso</Label>
              <p className="font-medium mt-1">15 de agosto, 2024 - 10:32 AM</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Fecha de Registro</Label>
              <p className="font-medium mt-1">01 de enero, 2024</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Estado</Label>
              <p className="mt-1"><Badge className="bg-emerald-100 text-emerald-700 border-0">Activo</Badge></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Cambiar Contrasena
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Contrasena Actual</Label>
              <Input type="password" placeholder="Ingrese su contrasena actual" />
            </div>
            <div className="space-y-2">
              <Label>Nueva Contrasena</Label>
              <Input type="password" placeholder="Ingrese la nueva contrasena" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nueva Contrasena</Label>
              <Input type="password" placeholder="Confirme la nueva contrasena" />
            </div>
            <Button>Actualizar Contrasena</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

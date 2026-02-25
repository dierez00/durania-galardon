"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/shared/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

const motivos = [
  { id: 1, nombre: "Exportacion", descripcion: "Prueba requerida para proceso de exportacion" },
  { id: 2, nombre: "Campana", descripcion: "Campana nacional de erradicacion" },
  { id: 3, nombre: "Movilizacion", descripcion: "Movilizacion de ganado entre estados" },
  { id: 4, nombre: "Vigilancia Epidemiologica", descripcion: "Monitoreo epidemiologico de rutina" },
  { id: 5, nombre: "Rastreo", descripcion: "Rastreo a partir de caso positivo" },
];

const lugares = [
  { id: 1, nombre: "Rancho/Predio", descripcion: "Prueba realizada en el rancho del productor" },
  { id: 2, nombre: "Corral de Inspeccion", descripcion: "Instalaciones oficiales de inspeccion" },
  { id: 3, nombre: "Rastro TIF", descripcion: "Rastro tipo inspeccion federal" },
  { id: 4, nombre: "Centro de Acopio", descripcion: "Centro de acopio autorizado" },
  { id: 5, nombre: "Feria Ganadera", descripcion: "Evento de exposicion ganadera" },
];

export default function CatalogosPage() {
  const [openMotivo, setOpenMotivo] = useState(false);
  const [openLugar, setOpenLugar] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catalogos</h1>
        <p className="text-sm text-muted-foreground mt-1">Administracion de catalogos del sistema</p>
      </div>

      <Tabs defaultValue="motivos">
        <TabsList>
          <TabsTrigger value="motivos">Motivos de Pruebas</TabsTrigger>
          <TabsTrigger value="lugares">Lugares de Pruebas</TabsTrigger>
        </TabsList>

        <TabsContent value="motivos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Motivos de Pruebas Sanitarias</CardTitle>
                <Dialog open={openMotivo} onOpenChange={setOpenMotivo}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Agregar Motivo</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Nuevo Motivo de Prueba</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2"><Label>Nombre</Label><Input placeholder="Nombre del motivo" /></div>
                      <div className="space-y-2"><Label>Descripcion</Label><Input placeholder="Descripcion breve" /></div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setOpenMotivo(false)}>Cancelar</Button>
                        <Button onClick={() => setOpenMotivo(false)}>Guardar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {motivos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{m.id}</TableCell>
                      <TableCell className="font-medium">{m.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{m.descripcion}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lugares">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Lugares de Pruebas Sanitarias</CardTitle>
                <Dialog open={openLugar} onOpenChange={setOpenLugar}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Agregar Lugar</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Nuevo Lugar de Prueba</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2"><Label>Nombre</Label><Input placeholder="Nombre del lugar" /></div>
                      <div className="space-y-2"><Label>Descripcion</Label><Input placeholder="Descripcion breve" /></div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setOpenLugar(false)}>Cancelar</Button>
                        <Button onClick={() => setOpenLugar(false)}>Guardar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lugares.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground">{l.id}</TableCell>
                      <TableCell className="font-medium">{l.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{l.descripcion}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

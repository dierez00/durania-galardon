"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Eye, MapPin } from "lucide-react";

const ranchos = [
  { id: 1, nombre: "Rancho El Potrero", productor: "Juan Perez Ramirez", municipio: "Chihuahua", localidad: "El Sauz", coords: "28.6353, -106.0889", bovinos: 120, estado: "Activo" },
  { id: 2, nombre: "Rancho Las Palmas", productor: "Juan Perez Ramirez", municipio: "Chihuahua", localidad: "Aldama Centro", coords: "28.8401, -105.9151", bovinos: 85, estado: "Activo" },
  { id: 3, nombre: "Rancho San Miguel", productor: "Pedro Gomez Torres", municipio: "Delicias", localidad: "Km 42", coords: "28.1870, -105.4714", bovinos: 95, estado: "Activo" },
  { id: 4, nombre: "Rancho La Esperanza", productor: "Roberto Hernandez", municipio: "Juarez", localidad: "Samalayuca", coords: "31.3456, -106.4437", bovinos: 210, estado: "Activo" },
  { id: 5, nombre: "Rancho Los Alamos", productor: "Roberto Hernandez", municipio: "Juarez", localidad: "Praxedis", coords: "31.3689, -106.0210", bovinos: 165, estado: "Activo" },
  { id: 6, nombre: "Hacienda Santa Rosa", productor: "Francisco Lopez Mendez", municipio: "Parral", localidad: "Villa Matamoros", coords: "26.9320, -105.6619", bovinos: 310, estado: "Inactivo" },
];

export default function RanchosPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Ranchos</h1>
              <p className="text-sm text-muted-foreground mt-1">Gestion de unidades de produccion pecuaria</p>
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Nuevo Rancho</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Registrar Nuevo Rancho</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre del Rancho</Label><Input placeholder="Nombre" /></div>
                    <div className="space-y-2"><Label>Productor</Label><Input placeholder="Buscar productor..." /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Municipio</Label><Input placeholder="Municipio" /></div>
                    <div className="space-y-2"><Label>Localidad</Label><Input placeholder="Localidad" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Latitud</Label><Input placeholder="28.6353" /></div>
                    <div className="space-y-2"><Label>Longitud</Label><Input placeholder="-106.0889" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicacion en Mapa</Label>
                    <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                      <MapPin className="w-5 h-5 mr-2" />Mapa de ubicacion
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                    <Button onClick={() => setOpenNew(false)}>Registrar Rancho</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="py-4">
            <CardContent className="py-0">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nombre, productor o municipio..." className="pl-9" />
                </div>
                <Button variant="outline">Filtros</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Productor</TableHead>
                    <TableHead>Municipio</TableHead>
                    <TableHead>Localidad</TableHead>
                    <TableHead>Coordenadas</TableHead>
                    <TableHead className="text-center">Bovinos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranchos.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{r.productor}</TableCell>
                      <TableCell>{r.municipio}</TableCell>
                      <TableCell>{r.localidad}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.coords}</TableCell>
                      <TableCell className="text-center">{r.bovinos}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${r.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{r.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setView("detail")}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setView("list")}>Volver al listado</Button>
            <div>
              <h1 className="text-2xl font-bold">Rancho El Potrero</h1>
              <p className="text-sm text-muted-foreground">Productor: Juan Perez Ramirez - Chihuahua</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Bovinos", value: "120" },
              { label: "Municipio", value: "Chihuahua" },
              { label: "Localidad", value: "El Sauz" },
              { label: "Coordenadas", value: "28.63, -106.08" },
            ].map((s) => (
              <Card key={s.label} className="py-4">
                <CardContent className="py-0">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold mt-0.5">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="bovinos">
            <TabsList>
              <TabsTrigger value="bovinos">Bovinos</TabsTrigger>
              <TabsTrigger value="pruebas">Historial de Pruebas</TabsTrigger>
              <TabsTrigger value="cuarentenas">Cuarentenas</TabsTrigger>
            </TabsList>
            <TabsContent value="bovinos">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arete</TableHead>
                        <TableHead>Sexo</TableHead>
                        <TableHead>Raza</TableHead>
                        <TableHead>Peso (kg)</TableHead>
                        <TableHead>Estado Sanitario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { arete: "MX-4521-8890", sexo: "Macho", raza: "Hereford", peso: 450, estado: "Limpio" },
                        { arete: "MX-4521-8891", sexo: "Hembra", raza: "Angus", peso: 380, estado: "Limpio" },
                        { arete: "MX-4521-8892", sexo: "Macho", raza: "Charolais", peso: 520, estado: "En cuarentena" },
                        { arete: "MX-4521-8893", sexo: "Hembra", raza: "Hereford", peso: 410, estado: "Limpio" },
                      ].map((b) => (
                        <TableRow key={b.arete}>
                          <TableCell className="font-mono font-medium">{b.arete}</TableCell>
                          <TableCell>{b.sexo}</TableCell>
                          <TableCell>{b.raza}</TableCell>
                          <TableCell>{b.peso}</TableCell>
                          <TableCell>
                            <Badge className={`border-0 ${b.estado === "Limpio" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{b.estado}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="pruebas">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>MVZ</TableHead>
                        <TableHead>Bovinos</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell>2024-08-10</TableCell><TableCell>TB + BR</TableCell><TableCell>MVZ. Ana Garcia</TableCell><TableCell>120</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell></TableRow>
                      <TableRow><TableCell>2024-05-22</TableCell><TableCell>TB + BR</TableCell><TableCell>MVZ. Roberto Diaz</TableCell><TableCell>115</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="cuarentenas">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arete</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin Previsto</TableHead>
                        <TableHead>MVZ</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono">MX-4521-8892</TableCell>
                        <TableCell>2024-08-01</TableCell>
                        <TableCell>2024-08-22</TableCell>
                        <TableCell>MVZ. Ana Garcia</TableCell>
                        <TableCell><Badge className="bg-amber-100 text-amber-700 border-0">Activa</Badge></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

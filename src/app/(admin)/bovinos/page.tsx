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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye } from "lucide-react";

const bovinos = [
  { id: 1, arete: "MX-4521-8890", sexo: "Macho", raza: "Hereford", peso: 450, nacimiento: "2021-03-15", rancho: "El Potrero", productor: "Juan Perez", sanitario: "Limpio" },
  { id: 2, arete: "MX-4521-8891", sexo: "Hembra", raza: "Angus", peso: 380, nacimiento: "2022-01-20", rancho: "El Potrero", productor: "Juan Perez", sanitario: "Limpio" },
  { id: 3, arete: "MX-4521-8892", sexo: "Macho", raza: "Charolais", peso: 520, nacimiento: "2020-07-08", rancho: "El Potrero", productor: "Juan Perez", sanitario: "Cuarentena" },
  { id: 4, arete: "MX-6720-3345", sexo: "Hembra", raza: "Brahman", peso: 410, nacimiento: "2021-11-22", rancho: "San Miguel", productor: "Pedro Gomez", sanitario: "Limpio" },
  { id: 5, arete: "MX-6720-3346", sexo: "Macho", raza: "Simmental", peso: 490, nacimiento: "2020-05-10", rancho: "San Miguel", productor: "Pedro Gomez", sanitario: "Limpio" },
  { id: 6, arete: "MX-8901-1120", sexo: "Hembra", raza: "Hereford", peso: 360, nacimiento: "2022-09-03", rancho: "La Esperanza", productor: "Roberto Hernandez", sanitario: "Reactor" },
  { id: 7, arete: "MX-8901-1121", sexo: "Macho", raza: "Angus", peso: 470, nacimiento: "2021-06-18", rancho: "La Esperanza", productor: "Roberto Hernandez", sanitario: "Limpio" },
  { id: 8, arete: "MX-8901-1122", sexo: "Hembra", raza: "Beefmaster", peso: 395, nacimiento: "2022-02-14", rancho: "Los Alamos", productor: "Roberto Hernandez", sanitario: "Limpio" },
];

function sanitarioBadge(estado: string) {
  const map: Record<string, string> = {
    Limpio: "bg-emerald-100 text-emerald-700",
    Cuarentena: "bg-amber-100 text-amber-700",
    Reactor: "bg-red-100 text-red-700",
  };
  return <Badge className={`border-0 ${map[estado] || ""}`}>{estado}</Badge>;
}

export default function BovinosPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Bovinos</h1>
              <p className="text-sm text-muted-foreground mt-1">Registro y gestion de ganado bovino</p>
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Alta de Bovino</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Registrar Nuevo Bovino</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Numero de Arete</Label><Input placeholder="MX-XXXX-XXXX" /></div>
                    <div className="space-y-2">
                      <Label>Sexo</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent><SelectItem value="macho">Macho</SelectItem><SelectItem value="hembra">Hembra</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Raza</Label><Input placeholder="Raza del bovino" /></div>
                    <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" placeholder="Peso en kilogramos" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Fecha de Nacimiento</Label><Input type="date" /></div>
                    <div className="space-y-2"><Label>Rancho</Label><Input placeholder="Buscar rancho..." /></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                    <Button onClick={() => setOpenNew(false)}>Registrar Bovino</Button>
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
                  <Input placeholder="Buscar por arete, raza, rancho o productor..." className="pl-9" />
                </div>
                <Select>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado sanitario" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="limpio">Limpio</SelectItem>
                    <SelectItem value="cuarentena">Cuarentena</SelectItem>
                    <SelectItem value="reactor">Reactor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arete</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Raza</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Nacimiento</TableHead>
                    <TableHead>Rancho</TableHead>
                    <TableHead>Productor</TableHead>
                    <TableHead>Estado Sanitario</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bovinos.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.arete}</TableCell>
                      <TableCell>{b.sexo}</TableCell>
                      <TableCell>{b.raza}</TableCell>
                      <TableCell>{b.peso}</TableCell>
                      <TableCell className="text-muted-foreground">{b.nacimiento}</TableCell>
                      <TableCell>{b.rancho}</TableCell>
                      <TableCell className="text-muted-foreground">{b.productor}</TableCell>
                      <TableCell>{sanitarioBadge(b.sanitario)}</TableCell>
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
              <h1 className="text-2xl font-bold">Bovino MX-4521-8890</h1>
              <p className="text-sm text-muted-foreground">Rancho El Potrero - Juan Perez Ramirez</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-2">Limpio</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Arete", value: "MX-4521-8890" },
              { label: "Sexo", value: "Macho" },
              { label: "Raza", value: "Hereford" },
              { label: "Peso", value: "450 kg" },
              { label: "Nacimiento", value: "2021-03-15" },
            ].map((s) => (
              <Card key={s.label} className="py-4">
                <CardContent className="py-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold mt-0.5">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="pruebas">
            <TabsList>
              <TabsTrigger value="pruebas">Historial de Pruebas</TabsTrigger>
              <TabsTrigger value="cuarentenas">Cuarentenas</TabsTrigger>
              <TabsTrigger value="exportaciones">Exportaciones</TabsTrigger>
            </TabsList>
            <TabsContent value="pruebas">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tuberculosis</TableHead>
                        <TableHead>Brucelosis</TableHead>
                        <TableHead>MVZ</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell>2024-08-10</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell><TableCell>MVZ. Ana Garcia</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Aprobado</Badge></TableCell></TableRow>
                      <TableRow><TableCell>2024-05-22</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell><TableCell>MVZ. Roberto Diaz</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Aprobado</Badge></TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="cuarentenas">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center py-8">Este bovino no tiene cuarentenas registradas.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="exportaciones">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Solicitud</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell className="font-mono">EXP-2024-0892</TableCell><TableCell>2024-08-12</TableCell><TableCell>Estados Unidos</TableCell><TableCell><Badge className="bg-blue-100 text-blue-700 border-0">En proceso</Badge></TableCell></TableRow>
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

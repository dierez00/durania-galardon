"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Eye, Clock } from "lucide-react";

const cuarentenas = [
  { id: 1, bovino: "MX-4521-8892", rancho: "El Potrero", mvz: "MVZ. Ana Garcia", inicio: "2024-08-01", prevista: "2024-08-22", real: "-", estado: "Activa", progreso: 68, observaciones: "Sospechoso TB - Pendiente segunda prueba" },
  { id: 2, bovino: "MX-8901-1120", rancho: "La Esperanza", mvz: "MVZ. Sofia Herrera", inicio: "2024-08-06", prevista: "2024-08-27", real: "-", estado: "Activa", progreso: 43, observaciones: "Reactor a TB - En observacion" },
  { id: 3, bovino: "MX-6720-3350", rancho: "San Miguel", mvz: "MVZ. Roberto Diaz", inicio: "2024-07-10", prevista: "2024-07-31", real: "2024-07-30", estado: "Completada", progreso: 100, observaciones: "Liberado - Resultado negativo en segunda prueba" },
  { id: 4, bovino: "MX-3321-5567", rancho: "Los Alamos", mvz: "MVZ. Ana Garcia", inicio: "2024-07-15", prevista: "2024-08-05", real: "2024-08-05", estado: "Completada", progreso: 100, observaciones: "Sacrificio sanitario - Reactor confirmado" },
  { id: 5, bovino: "MX-9912-4410", rancho: "Las Palmas", mvz: "MVZ. Roberto Diaz", inicio: "2024-08-12", prevista: "2024-09-02", real: "-", estado: "Activa", progreso: 14, observaciones: "Sospechoso BR - Prueba complementaria programada" },
];

function estadoBadge(e: string) {
  const map: Record<string, string> = {
    Activa: "bg-amber-100 text-amber-700",
    Completada: "bg-emerald-100 text-emerald-700",
  };
  return <Badge className={`border-0 ${map[e] || ""}`}>{e}</Badge>;
}

export default function CuarentenasPage() {
  const [openNew, setOpenNew] = useState(false);
  const [view, setView] = useState<"list" | "detail">("list");

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Cuarentenas</h1>
              <p className="text-sm text-muted-foreground mt-1">Seguimiento de cuarentenas sanitarias de bovinos</p>
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Nueva Cuarentena</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Registrar Nueva Cuarentena</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Arete del Bovino</Label><Input placeholder="MX-XXXX-XXXX" /></div>
                    <div className="space-y-2"><Label>Rancho</Label><Input placeholder="Rancho" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>MVZ Responsable</Label><Input placeholder="MVZ" /></div>
                    <div className="space-y-2"><Label>Fecha de Inicio</Label><Input type="date" /></div>
                  </div>
                  <div className="space-y-2"><Label>Fecha Prevista de Fin</Label><Input type="date" /></div>
                  <div className="space-y-2"><Label>Observaciones</Label><Textarea placeholder="Motivo y observaciones..." /></div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                    <Button onClick={() => setOpenNew(false)}>Registrar Cuarentena</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Activas</p>
                  <p className="text-xl font-bold">3</p>
                </div>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg"><Clock className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Completadas este mes</p>
                  <p className="text-xl font-bold">2</p>
                </div>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total historico</p>
                  <p className="text-xl font-bold">47</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="py-4">
            <CardContent className="py-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por arete, rancho o MVZ..." className="pl-9" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bovino</TableHead>
                    <TableHead>Rancho</TableHead>
                    <TableHead>MVZ</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Prevista</TableHead>
                    <TableHead>Fecha Real</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuarentenas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.bovino}</TableCell>
                      <TableCell>{c.rancho}</TableCell>
                      <TableCell className="text-muted-foreground">{c.mvz}</TableCell>
                      <TableCell>{c.inicio}</TableCell>
                      <TableCell>{c.prevista}</TableCell>
                      <TableCell className="text-muted-foreground">{c.real}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={c.progreso} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8">{c.progreso}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{estadoBadge(c.estado)}</TableCell>
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
              <h1 className="text-2xl font-bold">Cuarentena - MX-4521-8892</h1>
              <p className="text-sm text-muted-foreground">Rancho El Potrero</p>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-0 ml-2">Activa</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Bovino", value: "MX-4521-8892" },
              { label: "MVZ", value: "MVZ. Ana Garcia" },
              { label: "Inicio", value: "2024-08-01" },
              { label: "Fin Previsto", value: "2024-08-22" },
            ].map((s) => (
              <Card key={s.label} className="py-4">
                <CardContent className="py-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold mt-0.5">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Visual progress */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Progreso de Cuarentena</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dia 15 de 21</span>
                  <span className="font-medium">68%</span>
                </div>
                <Progress value={68} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>01 Ago 2024</span>
                  <span>22 Ago 2024</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Observaciones</h4>
                <p className="text-sm text-muted-foreground">
                  Sospechoso TB - Pendiente segunda prueba. Bovino aislado en corral de cuarentena.
                  Proxima evaluacion programada para el 18 de agosto.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Seguimiento</h3>
              <div className="space-y-4">
                {[
                  { fecha: "2024-08-01", evento: "Inicio de cuarentena", detalle: "Bovino aislado tras resultado sospechoso en prueba TB" },
                  { fecha: "2024-08-05", evento: "Revision de seguimiento", detalle: "Sin signos clinicos. Se mantiene en observacion" },
                  { fecha: "2024-08-10", evento: "Evaluacion intermedia", detalle: "Bovino estable. Se programa segunda prueba" },
                  { fecha: "2024-08-18", evento: "Segunda prueba programada", detalle: "Pendiente" },
                ].map((t, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i < 3 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      {i < 3 && <div className="w-px h-full bg-border" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs text-muted-foreground">{t.fecha}</p>
                      <p className="text-sm font-medium">{t.evento}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.detalle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

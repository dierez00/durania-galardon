"use client";

import { useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Plus, Search, Eye, CheckCircle, XCircle } from "lucide-react";

const pruebas = [
  { id: 1, fecha: "2024-08-10", mvz: "MVZ. Ana Garcia", supervisor: "Dr. Carlos Martinez", lugar: "Rancho El Potrero", motivo: "Exportacion", tb: "Negativo", br: "Negativo", resultado: "Aprobado", estado: "Completada" },
  { id: 2, fecha: "2024-08-08", mvz: "MVZ. Roberto Diaz", supervisor: "Dr. Carlos Martinez", lugar: "Rancho San Miguel", motivo: "Campana", tb: "Negativo", br: "Negativo", resultado: "Aprobado", estado: "Completada" },
  { id: 3, fecha: "2024-08-06", mvz: "MVZ. Sofia Herrera", supervisor: "Dr. Carlos Martinez", lugar: "Rancho La Esperanza", motivo: "Exportacion", tb: "Positivo", br: "Negativo", resultado: "Rechazado", estado: "Completada" },
  { id: 4, fecha: "2024-08-15", mvz: "MVZ. Ana Garcia", supervisor: "-", lugar: "Rancho Las Palmas", motivo: "Movilizacion", tb: "Pendiente", br: "Pendiente", resultado: "Pendiente", estado: "En proceso" },
  { id: 5, fecha: "2024-08-14", mvz: "MVZ. Roberto Diaz", supervisor: "-", lugar: "Rancho Los Alamos", motivo: "Exportacion", tb: "Pendiente", br: "Pendiente", resultado: "Pendiente", estado: "Pendiente" },
];

function resultBadge(r: string) {
  const map: Record<string, string> = {
    Aprobado: "bg-emerald-100 text-emerald-700",
    Rechazado: "bg-red-100 text-red-700",
    Pendiente: "bg-amber-100 text-amber-700",
    Negativo: "bg-emerald-100 text-emerald-700",
    Positivo: "bg-red-100 text-red-700",
  };
  return <Badge className={`border-0 ${map[r] || "bg-gray-100 text-gray-700"}`}>{r}</Badge>;
}

function estadoBadge(e: string) {
  const map: Record<string, string> = {
    Completada: "bg-emerald-100 text-emerald-700",
    "En proceso": "bg-blue-100 text-blue-700",
    Pendiente: "bg-amber-100 text-amber-700",
  };
  return <Badge className={`border-0 ${map[e] || ""}`}>{e}</Badge>;
}

export default function PruebasPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Pruebas Sanitarias</h1>
              <p className="text-sm text-muted-foreground mt-1">Gestion de pruebas de tuberculosis y brucelosis</p>
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Nueva Prueba</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Registrar Nueva Prueba Sanitaria</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Fecha</Label><Input type="date" /></div>
                    <div className="space-y-2">
                      <Label>MVZ Aprobador</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Seleccionar MVZ" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ana">MVZ. Ana Garcia</SelectItem>
                          <SelectItem value="roberto">MVZ. Roberto Diaz</SelectItem>
                          <SelectItem value="sofia">MVZ. Sofia Herrera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Supervisor</Label><Input placeholder="Nombre del supervisor" /></div>
                    <div className="space-y-2"><Label>Lugar de Prueba</Label><Input placeholder="Rancho o instalacion" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Motivo</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Motivo de prueba" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exportacion">Exportacion</SelectItem>
                          <SelectItem value="campana">Campana</SelectItem>
                          <SelectItem value="movilizacion">Movilizacion</SelectItem>
                          <SelectItem value="vigilancia">Vigilancia epidemiologica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Bovinos a Evaluar</Label>
                      <Input placeholder="Cantidad de bovinos" type="number" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observaciones</Label>
                    <Textarea placeholder="Notas adicionales sobre la prueba..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                    <Button onClick={() => setOpenNew(false)}>Registrar Prueba</Button>
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
                  <Input placeholder="Buscar por MVZ, lugar o motivo..." className="pl-9" />
                </div>
                <Select>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="proceso">En proceso</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
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
                    <TableHead>Fecha</TableHead>
                    <TableHead>MVZ Aprobador</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Lugar</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>TB</TableHead>
                    <TableHead>BR</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pruebas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.fecha}</TableCell>
                      <TableCell className="font-medium">{p.mvz}</TableCell>
                      <TableCell className="text-muted-foreground">{p.supervisor}</TableCell>
                      <TableCell>{p.lugar}</TableCell>
                      <TableCell>{p.motivo}</TableCell>
                      <TableCell>{resultBadge(p.tb)}</TableCell>
                      <TableCell>{resultBadge(p.br)}</TableCell>
                      <TableCell>{resultBadge(p.resultado)}</TableCell>
                      <TableCell>{estadoBadge(p.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setView("detail")}><Eye className="w-4 h-4" /></Button>
                          {p.estado === "Pendiente" && (
                            <>
                              <Button variant="ghost" size="icon"><CheckCircle className="w-4 h-4 text-emerald-600" /></Button>
                              <Button variant="ghost" size="icon"><XCircle className="w-4 h-4 text-red-500" /></Button>
                            </>
                          )}
                        </div>
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
              <h1 className="text-2xl font-bold">Prueba Sanitaria - 2024-08-10</h1>
              <p className="text-sm text-muted-foreground">Rancho El Potrero - Exportacion</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-2">Completada</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "MVZ Aprobador", value: "MVZ. Ana Garcia" },
              { label: "Supervisor", value: "Dr. Carlos Martinez" },
              { label: "Motivo", value: "Exportacion" },
              { label: "Bovinos Evaluados", value: "120" },
            ].map((s) => (
              <Card key={s.label} className="py-4">
                <CardContent className="py-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold mt-0.5">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Resultados por Bovino</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arete</TableHead>
                    <TableHead>Raza</TableHead>
                    <TableHead>Tuberculosis</TableHead>
                    <TableHead>Brucelosis</TableHead>
                    <TableHead>Resultado Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { arete: "MX-4521-8890", raza: "Hereford", tb: "Negativo", br: "Negativo", final: "Aprobado" },
                    { arete: "MX-4521-8891", raza: "Angus", tb: "Negativo", br: "Negativo", final: "Aprobado" },
                    { arete: "MX-4521-8892", raza: "Charolais", tb: "Negativo", br: "Negativo", final: "Aprobado" },
                    { arete: "MX-4521-8893", raza: "Hereford", tb: "Negativo", br: "Negativo", final: "Aprobado" },
                  ].map((r) => (
                    <TableRow key={r.arete}>
                      <TableCell className="font-mono font-medium">{r.arete}</TableCell>
                      <TableCell>{r.raza}</TableCell>
                      <TableCell>{resultBadge(r.tb)}</TableCell>
                      <TableCell>{resultBadge(r.br)}</TableCell>
                      <TableCell>{resultBadge(r.final)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

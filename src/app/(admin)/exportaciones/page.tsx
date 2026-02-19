"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Eye, CheckCircle, XCircle, ArrowRight } from "lucide-react";

const exportaciones = [
  { id: 1, arete: "MX-4521-8890", productor: "Juan Perez", rancho: "El Potrero", mvz: "MVZ. Ana Garcia", prueba: "2024-08-10", reactor: "No", areteAzul: "AZ-001-2024", estado: "Aprobada" },
  { id: 2, arete: "MX-4521-8891", productor: "Juan Perez", rancho: "El Potrero", mvz: "MVZ. Ana Garcia", prueba: "2024-08-10", reactor: "No", areteAzul: "AZ-002-2024", estado: "Aprobada" },
  { id: 3, arete: "MX-6720-3345", productor: "Pedro Gomez", rancho: "San Miguel", mvz: "MVZ. Roberto Diaz", prueba: "2024-08-08", reactor: "No", areteAzul: "-", estado: "En revision" },
  { id: 4, arete: "MX-8901-1121", productor: "Roberto Hernandez", rancho: "La Esperanza", mvz: "MVZ. Sofia Herrera", prueba: "2024-08-06", reactor: "No", areteAzul: "-", estado: "Pendiente" },
  { id: 5, arete: "MX-8901-1120", productor: "Roberto Hernandez", rancho: "La Esperanza", mvz: "MVZ. Sofia Herrera", prueba: "2024-08-06", reactor: "Si", areteAzul: "-", estado: "Rechazada" },
  { id: 6, arete: "MX-6720-3346", productor: "Pedro Gomez", rancho: "San Miguel", mvz: "MVZ. Roberto Diaz", prueba: "2024-08-08", reactor: "No", areteAzul: "AZ-003-2024", estado: "Aprobada" },
];

function estadoBadge(e: string) {
  const map: Record<string, string> = {
    Aprobada: "bg-emerald-100 text-emerald-700",
    "En revision": "bg-blue-100 text-blue-700",
    Pendiente: "bg-amber-100 text-amber-700",
    Rechazada: "bg-red-100 text-red-700",
  };
  return <Badge className={`border-0 ${map[e] || ""}`}>{e}</Badge>;
}

export default function ExportacionesPage() {
  const [view, setView] = useState<"list" | "detail">("list");

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Exportaciones</h1>
              <p className="text-sm text-muted-foreground mt-1">Gestion de solicitudes de exportacion bovina</p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Aprobadas", value: "3", color: "text-emerald-600" },
              { label: "En Revision", value: "1", color: "text-blue-600" },
              { label: "Pendientes", value: "1", color: "text-amber-600" },
              { label: "Rechazadas", value: "1", color: "text-red-600" },
            ].map((s) => (
              <Card key={s.label} className="py-4">
                <CardContent className="py-0">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="py-4">
            <CardContent className="py-0">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar por arete, productor o rancho..." className="pl-9" />
                </div>
                <Select>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aprobada">Aprobada</SelectItem>
                    <SelectItem value="revision">En revision</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="rechazada">Rechazada</SelectItem>
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
                    <TableHead>Productor</TableHead>
                    <TableHead>Rancho</TableHead>
                    <TableHead>MVZ</TableHead>
                    <TableHead>Prueba</TableHead>
                    <TableHead>Reactor</TableHead>
                    <TableHead>Arete Azul</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportaciones.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono font-medium">{e.arete}</TableCell>
                      <TableCell>{e.productor}</TableCell>
                      <TableCell>{e.rancho}</TableCell>
                      <TableCell className="text-muted-foreground">{e.mvz}</TableCell>
                      <TableCell className="text-muted-foreground">{e.prueba}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${e.reactor === "Si" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{e.reactor}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{e.areteAzul}</TableCell>
                      <TableCell>{estadoBadge(e.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setView("detail")}><Eye className="w-4 h-4" /></Button>
                          {(e.estado === "Pendiente" || e.estado === "En revision") && (
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
              <h1 className="text-2xl font-bold">Solicitud de Exportacion</h1>
              <p className="text-sm text-muted-foreground">MX-4521-8890 - Juan Perez Ramirez</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-2">Aprobada</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Arete", value: "MX-4521-8890" },
              { label: "Arete Azul", value: "AZ-001-2024" },
              { label: "Productor", value: "Juan Perez Ramirez" },
              { label: "Rancho", value: "El Potrero" },
            ].map((s) => (
              <Card key={s.label} className="py-4">
                <CardContent className="py-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold mt-0.5">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Approval flow */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-6">Flujo de Aprobacion</h3>
              <div className="flex items-center justify-between max-w-3xl mx-auto">
                {[
                  { step: "Solicitud", status: "done" },
                  { step: "Prueba Sanitaria", status: "done" },
                  { step: "Revision MVZ", status: "done" },
                  { step: "Arete Azul", status: "done" },
                  { step: "Aprobada", status: "done" },
                ].map((s, i, arr) => (
                  <div key={s.step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        s.status === "done"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.status === "current"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        {s.status === "done" ? <CheckCircle className="w-5 h-5" /> : i + 1}
                      </div>
                      <p className="text-xs mt-2 text-center max-w-[80px]">{s.step}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className={`w-5 h-5 mx-3 mt-[-20px] ${s.status === "done" ? "text-emerald-400" : "text-gray-300"}`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Informacion de la Prueba Asociada</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-xs text-muted-foreground">Fecha Prueba</p><p className="text-sm font-medium mt-0.5">2024-08-10</p></div>
                <div><p className="text-xs text-muted-foreground">MVZ</p><p className="text-sm font-medium mt-0.5">MVZ. Ana Garcia</p></div>
                <div><p className="text-xs text-muted-foreground">Tuberculosis</p><p className="text-sm font-medium mt-0.5"><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></p></div>
                <div><p className="text-xs text-muted-foreground">Brucelosis</p><p className="text-sm font-medium mt-0.5"><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></p></div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

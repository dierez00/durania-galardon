"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { MapPin } from "lucide-react";
import {
  RanchosFilters,
  RanchosList,
  listRanchos,
  filterRanchosUseCase,
  type RanchosFiltersState,
} from "@/modules/ranchos";
import { mockRanchosRepository } from "@/modules/ranchos/infra/mock";
import type { Rancho } from "@/modules/ranchos/domain/entities/RanchosEntity";

const allRanchos = listRanchos(mockRanchosRepository);

export default function RanchosPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [openNew, setOpenNew] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<Rancho>(allRanchos[0]);
  const [filters, setFilters] = useState<RanchosFiltersState>({
    search: "",
    municipio: "",
    estado: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const filteredRanchos = useMemo(
    () => filterRanchosUseCase(allRanchos, filters),
    [filters]
  );

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div>
            <h1 className="text-2xl font-bold">Ranchos</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestion de unidades de produccion pecuaria</p>
          </div>

          <Dialog open={openNew} onOpenChange={setOpenNew}>
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

          <RanchosFilters
            filters={filters}
            onFiltersChange={setFilters}
            onAddRancho={() => setOpenNew(true)}
          />

          <RanchosList
            ranchos={filteredRanchos}
            onView={(r) => { setSelectedDetail(r); setView("detail"); }}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setView("list")}>Volver al listado</Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedDetail.nombre}</h1>
              <p className="text-sm text-muted-foreground">Productor: {selectedDetail.productor} - {selectedDetail.municipio}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Bovinos",      value: String(selectedDetail.bovinos) },
              { label: "Municipio",    value: selectedDetail.municipio },
              { label: "Localidad",    value: selectedDetail.localidad },
              { label: "Coordenadas",  value: selectedDetail.coords },
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

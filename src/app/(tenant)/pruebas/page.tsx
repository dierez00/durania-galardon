"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  PruebasFilters,
  PruebasList,
  PruebaResultBadge,
  listPruebas,
  filterPruebasUseCase,
  type PruebasFiltersState,
} from "@/modules/pruebas";
import { mockPruebasRepository } from "@/modules/pruebas/infra/mock";
import type { PruebaSanitaria } from "@/modules/pruebas/domain/entities/PruebasEntity";

const allPruebas = listPruebas(mockPruebasRepository);

export default function PruebasPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [openNew, setOpenNew] = useState(false);
  const [selectedPrueba, setSelectedPrueba] = useState<PruebaSanitaria>(allPruebas[0]);
  const [filters, setFilters] = useState<PruebasFiltersState>({
    search: "",
    motivo: "",
    estado: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const filteredPruebas = useMemo(
    () => filterPruebasUseCase(allPruebas, filters),
    [filters]
  );

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div>
            <h1 className="text-2xl font-bold">Pruebas Sanitarias</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestion de pruebas de tuberculosis y brucelosis</p>
          </div>

          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Registrar Nueva Prueba Sanitaria</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Fecha</Label><Input type="date" /></div>
                  <div className="space-y-2">
                    <Label>MVZ Aprobador</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Seleccionar MVZ" /></SelectTrigger>
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
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Motivo de prueba" /></SelectTrigger>
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

          <PruebasFilters
            filters={filters}
            onFiltersChange={setFilters}
            onAddPrueba={() => setOpenNew(true)}
          />

          <PruebasList
            pruebas={filteredPruebas}
            onView={(p) => { setSelectedPrueba(p); setView("detail"); }}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setView("list")}>Volver al listado</Button>
            <div>
              <h1 className="text-2xl font-bold">Prueba Sanitaria - {selectedPrueba.fecha}</h1>
              <p className="text-sm text-muted-foreground">{selectedPrueba.lugar} - {selectedPrueba.motivo}</p>
            </div>
            <PruebaResultBadge value={selectedPrueba.estado} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "MVZ Aprobador",     value: selectedPrueba.mvz },
              { label: "Supervisor",        value: selectedPrueba.supervisor },
              { label: "Motivo",            value: selectedPrueba.motivo },
              { label: "Bovinos Evaluados", value: "—" },
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
                    { arete: "MX-4521-8891", raza: "Angus",    tb: "Negativo", br: "Negativo", final: "Aprobado" },
                    { arete: "MX-4521-8892", raza: "Charolais",tb: "Negativo", br: "Negativo", final: "Aprobado" },
                    { arete: "MX-4521-8893", raza: "Hereford", tb: "Negativo", br: "Negativo", final: "Aprobado" },
                  ].map((r) => (
                    <TableRow key={r.arete}>
                      <TableCell className="font-mono font-medium">{r.arete}</TableCell>
                      <TableCell>{r.raza}</TableCell>
                      <TableCell><PruebaResultBadge value={r.tb} /></TableCell>
                      <TableCell><PruebaResultBadge value={r.br} /></TableCell>
                      <TableCell><PruebaResultBadge value={r.final} /></TableCell>
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


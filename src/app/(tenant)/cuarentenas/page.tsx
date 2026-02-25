"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Progress } from "@/shared/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Clock } from "lucide-react";
import {
  CuarentenasFilters,
  CuarentenasList,
  CuarentenaEstadoBadge,
  listCuarentenas,
  filterCuarentenasUseCase,
  type CuarentenasFiltersState,
} from "@/modules/cuarentenas";
import { mockCuarentenasRepository } from "@/modules/cuarentenas/infra/mock";
import type { Cuarentena } from "@/modules/cuarentenas/domain/entities/CuarentenasEntity";

const allCuarentenas = listCuarentenas(mockCuarentenasRepository);

export default function CuarentenasPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [openNew, setOpenNew] = useState(false);
  const [selectedCuarentena, setSelectedCuarentena] = useState<Cuarentena>(allCuarentenas[0]);
  const [filters, setFilters] = useState<CuarentenasFiltersState>({
    search: "",
    estado: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const filteredCuarentenas = useMemo(
    () => filterCuarentenasUseCase(allCuarentenas, filters),
    [filters]
  );

  const activasCount     = allCuarentenas.filter((c) => c.estado === "Activa").length;
  const completadasCount = allCuarentenas.filter((c) => c.estado === "Completada").length;

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div>
            <h1 className="text-2xl font-bold">Cuarentenas</h1>
            <p className="text-sm text-muted-foreground mt-1">Seguimiento de cuarentenas sanitarias de bovinos</p>
          </div>

          <Dialog open={openNew} onOpenChange={setOpenNew}>
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
                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Textarea placeholder="Motivo y observaciones..." />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                  <Button onClick={() => setOpenNew(false)}>Registrar Cuarentena</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Activas</p>
                  <p className="text-xl font-bold">{activasCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg"><Clock className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-xl font-bold">{completadasCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total historico</p>
                  <p className="text-xl font-bold">{allCuarentenas.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <CuarentenasFilters
            filters={filters}
            onFiltersChange={setFilters}
            onAddCuarentena={() => setOpenNew(true)}
          />

          <CuarentenasList
            cuarentenas={filteredCuarentenas}
            onView={(c) => { setSelectedCuarentena(c); setView("detail"); }}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setView("list")}>Volver al listado</Button>
            <div>
              <h1 className="text-2xl font-bold">Cuarentena - {selectedCuarentena.bovino}</h1>
              <p className="text-sm text-muted-foreground">{selectedCuarentena.rancho}</p>
            </div>
            <CuarentenaEstadoBadge value={selectedCuarentena.estado} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Bovino",       value: selectedCuarentena.bovino },
              { label: "MVZ",          value: selectedCuarentena.mvz },
              { label: "Inicio",       value: selectedCuarentena.inicio },
              { label: "Fin Previsto", value: selectedCuarentena.prevista },
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
              <h3 className="font-semibold mb-4">Progreso de Cuarentena</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progreso actual</span>
                  <span className="font-medium">{selectedCuarentena.progreso}%</span>
                </div>
                <Progress value={selectedCuarentena.progreso} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{selectedCuarentena.inicio}</span>
                  <span>{selectedCuarentena.prevista}</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Observaciones</h4>
                <p className="text-sm text-muted-foreground">{selectedCuarentena.observaciones}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Seguimiento</h3>
              <div className="space-y-4">
                {[
                  { key: "inicio",   fecha: selectedCuarentena.inicio,  evento: "Inicio de cuarentena",    detalle: "Bovino aislado tras resultado sospechoso" },
                  { key: "revision", fecha: "-",                         evento: "Revision de seguimiento", detalle: "Sin signos clinicos. Se mantiene en observacion" },
                  { key: "fin",      fecha: selectedCuarentena.prevista, evento: "Fin previsto",            detalle: selectedCuarentena.real === "-" ? "Pendiente" : `Finalizado el ${selectedCuarentena.real}` },
                ].map((t, i) => (
                  <div key={t.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i < 2 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      {i < 2 && <div className="w-px h-full bg-border" />}
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

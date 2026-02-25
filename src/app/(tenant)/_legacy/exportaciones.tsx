"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import {
  ExportacionesFilters,
  ExportacionesList,
  ExportacionEstadoBadge,
  listExportaciones,
  filterExportacionesUseCase,
  type ExportacionesFiltersState,
} from "@/modules/exportaciones";
import { mockExportacionesRepository } from "@/modules/exportaciones/infra/mock";
import type { Exportacion } from "@/modules/exportaciones/domain/entities/ExportacionesEntity";

const allExportaciones = listExportaciones(mockExportacionesRepository);

function getRevisionMVZStatus(estado: string): string {
  if (estado === "Aprobada")    return "done";
  if (estado === "En revision") return "current";
  return "pending";
}

function getStepColor(status: string): string {
  if (status === "done")    return "bg-emerald-100 text-emerald-700";
  if (status === "current") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-400";
}

export default function ExportacionesPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedExportacion, setSelectedExportacion] = useState<Exportacion>(allExportaciones[0]);
  const [filters, setFilters] = useState<ExportacionesFiltersState>({
    search: "",
    estado: "",
    reactor: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const filteredExportaciones = useMemo(
    () => filterExportacionesUseCase(allExportaciones, filters),
    [filters]
  );

  const countByEstado = (estado: string) => allExportaciones.filter((e) => e.estado === estado).length;

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div>
            <h1 className="text-2xl font-bold">Exportaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestion de solicitudes de exportacion bovina</p>
          </div>

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Aprobadas",   value: countByEstado("Aprobada"),     color: "text-emerald-600" },
              { label: "En Revision", value: countByEstado("En revision"),  color: "text-blue-600" },
              { label: "Pendientes",  value: countByEstado("Pendiente"),    color: "text-amber-600" },
              { label: "Rechazadas",  value: countByEstado("Rechazada"),    color: "text-red-600" },
            ].map((s) => (
              <Card key={s.label} className="py-4">
                <CardContent className="py-0">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <ExportacionesFilters filters={filters} onFiltersChange={setFilters} />

          <ExportacionesList
            exportaciones={filteredExportaciones}
            onView={(e) => { setSelectedExportacion(e); setView("detail"); }}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setView("list")}>Volver al listado</Button>
            <div>
              <h1 className="text-2xl font-bold">Solicitud de Exportacion</h1>
              <p className="text-sm text-muted-foreground">{selectedExportacion.arete} - {selectedExportacion.productor}</p>
            </div>
            <ExportacionEstadoBadge value={selectedExportacion.estado} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Arete",      value: selectedExportacion.arete },
              { label: "Arete Azul", value: selectedExportacion.areteAzul },
              { label: "Productor",  value: selectedExportacion.productor },
              { label: "Rancho",     value: selectedExportacion.rancho },
            ].map((s) => (
              <Card key={s.label} className="py-4">
                <CardContent className="py-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold mt-0.5">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Flujo de aprobacion */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-6">Flujo de Aprobacion</h3>
              <div className="flex items-center justify-between max-w-3xl mx-auto">
                {[
                  { step: "Solicitud",        status: "done" },
                  { step: "Prueba Sanitaria", status: "done" },
                  { step: "Revision MVZ",     status: getRevisionMVZStatus(selectedExportacion.estado) },
                  { step: "Arete Azul",       status: selectedExportacion.estado === "Aprobada" ? "done" : "pending" },
                  { step: "Aprobada",         status: selectedExportacion.estado === "Aprobada" ? "done" : "pending" },
                ].map((s, i, arr) => (
                  <div key={s.step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getStepColor(s.status)}`}>
                        {s.status === "done" ? <CheckCircle className="w-5 h-5" /> : i + 1}
                      </div>
                      <p className="text-xs mt-2 text-center max-w-20">{s.step}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className={`w-5 h-5 mx-3 -mt-5 ${s.status === "done" ? "text-emerald-400" : "text-gray-300"}`} />
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
                <div>
                  <p className="text-xs text-muted-foreground">Fecha Prueba</p>
                  <p className="text-sm font-medium mt-0.5">{selectedExportacion.prueba}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MVZ</p>
                  <p className="text-sm font-medium mt-0.5">{selectedExportacion.mvz}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tuberculosis</p>
                  <p className="text-sm font-medium mt-0.5">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Brucelosis</p>
                  <p className="text-sm font-medium mt-0.5">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

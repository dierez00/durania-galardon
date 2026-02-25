"use client";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import type { Exportacion } from "@/modules/exportaciones/domain/entities/ExportacionesEntity";
import { ExportacionEstadoBadge } from "./ExportacionEstadoBadge";

interface ExportacionesListProps {
  readonly exportaciones: readonly Exportacion[];
  readonly onView: (exportacion: Exportacion) => void;
}

export function ExportacionesList({ exportaciones, onView }: ExportacionesListProps) {
  return (
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
            {exportaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No se encontraron exportaciones.
                </TableCell>
              </TableRow>
            ) : (
              exportaciones.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono font-medium">{e.arete}</TableCell>
                  <TableCell>{e.productor}</TableCell>
                  <TableCell>{e.rancho}</TableCell>
                  <TableCell className="text-muted-foreground">{e.mvz}</TableCell>
                  <TableCell className="text-muted-foreground">{e.prueba}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${e.reactor === "Si" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {e.reactor}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{e.areteAzul}</TableCell>
                  <TableCell><ExportacionEstadoBadge value={e.estado} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView(e)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(e.estado === "Pendiente" || e.estado === "En revision") && (
                        <>
                          <Button variant="ghost" size="icon">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <XCircle className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

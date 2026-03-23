"use client";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { PruebaResultBadge } from "./PruebaResultBadge";
import type { PruebaSanitaria } from "@/modules/pruebas/domain/entities/PruebasEntity";

interface PruebasListProps {
  readonly pruebas: PruebaSanitaria[];
  readonly onView?: (prueba: PruebaSanitaria) => void;
}

export function PruebasList({ pruebas, onView }: PruebasListProps) {
  return (
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
            {pruebas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No se encontraron pruebas sanitarias.
                </TableCell>
              </TableRow>
            ) : (
              pruebas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.fecha}</TableCell>
                  <TableCell className="font-medium">{p.mvz}</TableCell>
                  <TableCell className="text-muted-foreground">{p.supervisor}</TableCell>
                  <TableCell>{p.lugar}</TableCell>
                  <TableCell>{p.motivo}</TableCell>
                  <TableCell><PruebaResultBadge value={p.tb} /></TableCell>
                  <TableCell><PruebaResultBadge value={p.br} /></TableCell>
                  <TableCell><PruebaResultBadge value={p.resultado} /></TableCell>
                  <TableCell><PruebaResultBadge value={p.estado} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView?.(p)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {p.estado === "Pendiente" && (
                        <>
                          <Button variant="ghost" size="icon">
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <XCircle className="w-4 h-4 text-error" />
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

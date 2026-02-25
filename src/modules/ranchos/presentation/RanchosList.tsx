"use client";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Eye } from "lucide-react";
import type { Rancho } from "@/modules/ranchos/domain/entities/RanchosEntity";

interface RanchosListProps {
  readonly ranchos: Rancho[];
  readonly onView?: (rancho: Rancho) => void;
}

export function RanchosList({ ranchos, onView }: RanchosListProps) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Productor</TableHead>
              <TableHead>Municipio</TableHead>
              <TableHead>Localidad</TableHead>
              <TableHead>Coordenadas</TableHead>
              <TableHead className="text-center">Bovinos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranchos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No se encontraron ranchos.
                </TableCell>
              </TableRow>
            ) : (
              ranchos.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{r.productor}</TableCell>
                  <TableCell>{r.municipio}</TableCell>
                  <TableCell>{r.localidad}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.coords}</TableCell>
                  <TableCell className="text-center">{r.bovinos}</TableCell>
                  <TableCell>
                    <Badge
                      className={`border-0 ${
                        r.estado === "Activo"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {r.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onView?.(r)}>
                      <Eye className="w-4 h-4" />
                    </Button>
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

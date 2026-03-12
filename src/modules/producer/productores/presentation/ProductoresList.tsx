"use client";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Eye, Pencil } from "lucide-react";
import type { Productor } from "@/modules/producer/productores/domain/entities/ProductoresEntity";

interface ProductoresListProps {
  productores: Productor[];
  onView?: (productor: Productor) => void;
  onEdit?: (productor: Productor) => void;
}

export function ProductoresList({ productores, onView, onEdit }: ProductoresListProps) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CURP</TableHead>
              <TableHead>Municipio</TableHead>
              <TableHead className="text-center">Ranchos</TableHead>
              <TableHead className="text-center">Bovinos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron productores.
                </TableCell>
              </TableRow>
            ) : (
              productores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{p.curp}</TableCell>
                  <TableCell>{p.municipio}</TableCell>
                  <TableCell className="text-center">{p.ranchos}</TableCell>
                  <TableCell className="text-center">{p.bovinos}</TableCell>
                  <TableCell>
                    <Badge
                      className={`border-0 ${
                        p.estado === "Activo"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView?.(p)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit?.(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
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

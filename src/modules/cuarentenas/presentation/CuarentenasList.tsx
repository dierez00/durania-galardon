"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Eye } from "lucide-react";
import type { Cuarentena } from "@/modules/cuarentenas/domain/entities/CuarentenasEntity";
import { CuarentenaEstadoBadge } from "./CuarentenaEstadoBadge";

interface CuarentenasListProps {
  readonly cuarentenas: readonly Cuarentena[];
  readonly onView: (cuarentena: Cuarentena) => void;
}

export function CuarentenasList({ cuarentenas, onView }: CuarentenasListProps) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bovino</TableHead>
              <TableHead>Rancho</TableHead>
              <TableHead>MVZ</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Fecha Prevista</TableHead>
              <TableHead>Fecha Real</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuarentenas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No se encontraron cuarentenas.
                </TableCell>
              </TableRow>
            ) : (
              cuarentenas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.bovino}</TableCell>
                  <TableCell>{c.rancho}</TableCell>
                  <TableCell className="text-muted-foreground">{c.mvz}</TableCell>
                  <TableCell>{c.inicio}</TableCell>
                  <TableCell>{c.prevista}</TableCell>
                  <TableCell className="text-muted-foreground">{c.real}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-28">
                      <Progress value={c.progreso} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{c.progreso}%</span>
                    </div>
                  </TableCell>
                  <TableCell><CuarentenaEstadoBadge value={c.estado} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onView(c)}>
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

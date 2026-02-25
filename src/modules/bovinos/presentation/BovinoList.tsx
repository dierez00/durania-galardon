"use client";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Eye } from "lucide-react";
import { SanitarioBadge } from "./SanitarioBadge";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";

interface Props {
  readonly bovinos: Bovino[];
  readonly onSelect: (bovino: Bovino) => void;
}

export function BovinoList({ bovinos, onSelect }: Props) {
  return (
    <div className="space-y-4">

      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arete</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Raza</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Nacimiento</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Productor</TableHead>
                <TableHead>Estado Sanitario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bovinos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No se encontraron bovinos.
                  </TableCell>
                </TableRow>
              ) : (
                bovinos.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-medium">{b.arete}</TableCell>
                    <TableCell>{b.sexo}</TableCell>
                    <TableCell>{b.raza}</TableCell>
                    <TableCell>{b.peso}</TableCell>
                    <TableCell className="text-muted-foreground">{b.nacimiento}</TableCell>
                    <TableCell>{b.rancho}</TableCell>
                    <TableCell className="text-muted-foreground">{b.productor}</TableCell>
                    <TableCell><SanitarioBadge estado={b.sanitario} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => onSelect(b)}>
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
    </div>
  );
}

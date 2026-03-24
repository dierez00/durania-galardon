"use client";

import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { CitaEstadoBadge } from "./CitaEstadoBadge";
import type { Cita } from "@/modules/admin/citas/domain/entities/CitaEntity";

interface Props {
  citas: Cita[];
}

export function CitasList({ citas }: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Servicio solicitado</TableHead>
              <TableHead>Fecha solicitada</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Registrada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {citas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron citas.
                </TableCell>
              </TableRow>
            ) : (
              citas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell>{c.requested_service}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.requested_date ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.requested_time ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.email ?? c.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <CitaEstadoBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.created_at).toLocaleDateString("es-MX")}
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

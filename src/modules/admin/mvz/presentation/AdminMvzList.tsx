"use client";

import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { AdminMvzEstadoBadge } from "./AdminMvzEstadoBadge";
import type { AdminMvz } from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";

interface Props {
  mvzList: AdminMvz[];
}

export function AdminMvzList({ mvzList }: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula MVZ</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">UPPs asignadas</TableHead>
              <TableHead className="text-center">Pruebas registradas</TableHead>
              <TableHead>Registrado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mvzList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No se encontraron MVZ.
                </TableCell>
              </TableRow>
            ) : (
              mvzList.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name}</TableCell>
                  <TableCell className="font-mono text-xs">{m.license_number}</TableCell>
                  <TableCell>
                    <AdminMvzEstadoBadge status={m.status} />
                  </TableCell>
                  <TableCell className="text-center">{m.assignedUpps}</TableCell>
                  <TableCell className="text-center">{m.registeredTests}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(m.created_at).toLocaleDateString("es-MX")}
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

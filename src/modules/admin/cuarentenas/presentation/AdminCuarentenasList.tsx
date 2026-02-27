"use client";

import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { AdminCuarentenaEstadoBadge } from "./AdminCuarentenaEstadoBadge";
import type { AdminCuarentena } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaEntity";

interface Props {
  cuarentenas: AdminCuarentena[];
}

export function AdminCuarentenasList({ cuarentenas }: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>UPP</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Inicio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuarentenas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No se encontraron cuarentenas.
                </TableCell>
              </TableRow>
            ) : (
              cuarentenas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{c.upp_id ?? "—"}</TableCell>
                  <TableCell className="capitalize">{c.quarantine_type}</TableCell>
                  <TableCell>
                    <AdminCuarentenaEstadoBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.started_at).toLocaleDateString("es-MX")}
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

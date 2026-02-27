"use client";

import { Card, CardContent } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { AdminExportacionEstadoBadge } from "./AdminExportacionEstadoBadge";
import type { AdminExportacion } from "@/modules/admin/exportaciones/domain/entities/AdminExportacionEntity";

function Check({ value }: Readonly<{ value: boolean | null }>) {
  if (value === true) return <span className="text-emerald-600 font-medium">Sí</span>;
  if (value === false) return <span className="text-red-500 font-medium">No</span>;
  return <span className="text-muted-foreground">—</span>;
}

interface Props {
  exportaciones: AdminExportacion[];
}

export function AdminExportacionesList({ exportaciones }: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>UPP</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Regla 60</TableHead>
              <TableHead className="text-center">TB/BR</TableHead>
              <TableHead className="text-center">Arete azul</TableHead>
              <TableHead>Motivo bloqueo</TableHead>
              <TableHead>Creada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exportaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron exportaciones.
                </TableCell>
              </TableRow>
            ) : (
              exportaciones.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.upp_id ?? "—"}</TableCell>
                  <TableCell>
                    <AdminExportacionEstadoBadge status={e.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Check value={e.compliance_60_rule} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Check value={e.tb_br_validated} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Check value={e.blue_tag_assigned} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.blocked_reason ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(e.created_at).toLocaleDateString("es-MX")}
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

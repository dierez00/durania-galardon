"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import type { AuditoriaLog } from "@/modules/admin/auditoria/domain/entities/AuditoriaLogEntity";

const ACTION_COLORS: Record<string, string> = {
  create:       "bg-emerald-100 text-emerald-700",
  update:       "bg-blue-100 text-blue-700",
  delete:       "bg-red-100 text-red-700",
  export:       "bg-purple-100 text-purple-700",
  status_change:"bg-amber-100 text-amber-700",
  fraud_attempt:"bg-red-200 text-red-800",
};

interface Props {
  logs: AuditoriaLog[];
}

export function AuditoriaList({ logs }: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actor</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Accion</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>ID recurso</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay registros de auditoria.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{log.actor_user_id ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{log.role_key ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-500"}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.resource}</TableCell>
                  <TableCell className="font-mono text-xs">{log.resource_id ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(log.created_at).toLocaleString("es-MX")}
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

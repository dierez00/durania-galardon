"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";
import type { AuditoriaLog } from "@/modules/admin/auditoria/domain/entities/AuditoriaLogEntity";

const ACTION_TONES: Record<string, SemanticTone> = {
  create: "success",
  update: "info",
  delete: "error",
  export: "accent",
  status_change: "warning",
  fraud_attempt: "error",
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
                    <Badge variant={toneToBadgeVariant[ACTION_TONES[log.action] ?? "neutral"]}>
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

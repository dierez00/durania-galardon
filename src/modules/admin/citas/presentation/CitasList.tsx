"use client";

import { Edit3, Eye, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { CitaEstadoBadge } from "./CitaEstadoBadge";
import type { Cita } from "@/modules/admin/citas/domain/entities/CitaEntity";
import { getAppointmentStatusActionLabel } from "./appointment-status";

interface Props {
  citas: Cita[];
  onEdit?: (appointmentId: string) => void;
  onViewMore?: (appointmentId: string) => void;
  onStatusChange?: (appointment: Cita) => void;
  isStatusActionDisabled?: (appointment: Cita) => boolean;
}

export function CitasList({
  citas,
  onEdit,
  onViewMore,
  onStatusChange,
  isStatusActionDisabled,
}: Readonly<Props>) {
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
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {citas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                  <TableCell className="text-right">
                    <TableRowActions
                      items={[
                        {
                          key: "edit",
                          label: "Editar",
                          icon: Edit3,
                          onSelect: () => onEdit?.(c.id),
                          disabled: !onEdit,
                        },
                        {
                          key: "status",
                          label: getAppointmentStatusActionLabel(c.status),
                          icon: RefreshCw,
                          onSelect: () => onStatusChange?.(c),
                          disabled: !onStatusChange || isStatusActionDisabled?.(c),
                        },
                        {
                          key: "view",
                          label: "Ver mas",
                          icon: Eye,
                          onSelect: () => onViewMore?.(c.id),
                          disabled: !onViewMore,
                        },
                      ]}
                    />
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

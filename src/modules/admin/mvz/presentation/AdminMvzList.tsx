"use client";

import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Edit3, Eye, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { AdminMvzEstadoBadge } from "./AdminMvzEstadoBadge";
import type {
  AdminMvz,
  AdminMvzSortField,
  AdminMvzSortState,
} from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";
import { cn } from "@/shared/lib/utils";

interface Props {
  mvzList: AdminMvz[];
  sort: AdminMvzSortState;
  onSortChange: (sort: AdminMvzSortState) => void;
  onEdit?: (mvzId: string) => void;
  onViewMore?: (mvzId: string) => void;
  onToggleStatus?: (mvz: AdminMvz) => void;
  isStatusActionDisabled?: (mvz: AdminMvz) => boolean;
}

interface SortableHeadProps {
  field: AdminMvzSortField;
  sort: AdminMvzSortState;
  onSortChange: (sort: AdminMvzSortState) => void;
  children: ReactNode;
  className?: string;
}

function getSortIcon(
  isActive: boolean,
  dir: "asc" | "desc"
): typeof ArrowUp | typeof ArrowDown | typeof ArrowUpDown {
  if (!isActive) return ArrowUpDown;
  return dir === "asc" ? ArrowUp : ArrowDown;
}

function SortableHead({ field, sort, onSortChange, children, className }: Readonly<SortableHeadProps>) {
  const isActive = sort.field === field;
  const nextDir = isActive && sort.dir === "desc" ? "asc" : "desc";
  const Icon = getSortIcon(isActive, sort.dir);

  return (
    <TableHead className={cn(className)}>
      <button
        type="button"
        onClick={() => onSortChange({ field, dir: nextDir })}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
        <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "")} />
      </button>
    </TableHead>
  );
}

export function AdminMvzList({
  mvzList,
  sort,
  onSortChange,
  onEdit,
  onViewMore,
  onToggleStatus,
  isStatusActionDisabled,
}: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula MVZ</TableHead>
              <TableHead>Estado</TableHead>
              <SortableHead field="active_assignments" sort={sort} onSortChange={onSortChange} className="text-center">
                UPPs asignadas
              </SortableHead>
              <SortableHead field="tests_last_year" sort={sort} onSortChange={onSortChange} className="text-center">
                Pruebas (año)
              </SortableHead>
              <SortableHead field="registered_at" sort={sort} onSortChange={onSortChange}>
                Registrado
              </SortableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mvzList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                  <TableCell className="text-right">
                    <TableRowActions
                      items={[
                        {
                          key: "edit",
                          label: "Editar",
                          icon: Edit3,
                          onSelect: () => onEdit?.(m.id),
                          disabled: !onEdit,
                        },
                        {
                          key: "status",
                          label: m.status === "active" ? "Desactivar" : "Activar",
                          icon: RefreshCw,
                          onSelect: () => onToggleStatus?.(m),
                          disabled: !onToggleStatus || isStatusActionDisabled?.(m),
                        },
                        {
                          key: "view",
                          label: "Ver mas",
                          icon: Eye,
                          onSelect: () => onViewMore?.(m.id),
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

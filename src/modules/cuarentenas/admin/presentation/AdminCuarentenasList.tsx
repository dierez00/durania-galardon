"use client";

import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Edit3, Eye, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { AdminCuarentenaEstadoBadge } from "./AdminCuarentenaEstadoBadge";
import type {
  AdminCuarentena,
  AdminCuarentenasSortField,
  AdminCuarentenasSortState,
} from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaEntity";
import { cn } from "@/shared/lib/utils";

interface Props {
  cuarentenas: AdminCuarentena[];
  sort: AdminCuarentenasSortState;
  onSortChange: (next: AdminCuarentenasSortState) => void;
  onEdit?: (quarantineId: string) => void;
  onViewMore?: (quarantineId: string) => void;
  onStatusChange?: (quarantine: AdminCuarentena) => void;
  isStatusActionDisabled?: (quarantine: AdminCuarentena) => boolean;
}

interface SortableHeadProps {
  field: AdminCuarentenasSortField;
  sort: AdminCuarentenasSortState;
  onSortChange: (sort: AdminCuarentenasSortState) => void;
  children: ReactNode;
  className?: string;
}

function getSortIcon(
  isActive: boolean,
  dir: "asc" | "desc",
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
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
        <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "")} />
      </button>
    </TableHead>
  );
}

export function AdminCuarentenasList({
  cuarentenas,
  sort,
  onSortChange,
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
              <TableHead>Titulo</TableHead>
              <TableHead>Rancho (UPP)</TableHead>
              <TableHead>Productor</TableHead>
              <SortableHead field="quarantine_type" sort={sort} onSortChange={onSortChange}>Tipo</SortableHead>
              <SortableHead field="status" sort={sort} onSortChange={onSortChange}>Estado</SortableHead>
              <SortableHead field="started_at" sort={sort} onSortChange={onSortChange}>Inicio</SortableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuarentenas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No se encontraron cuarentenas.
                </TableCell>
              </TableRow>
            ) : (
              cuarentenas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.uppName ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.producerName ?? "-"}</TableCell>
                  <TableCell className="text-sm">
                    {c.quarantineType === "state" ? "Estatal" : "Operacional"}
                  </TableCell>
                  <TableCell>
                    <AdminCuarentenaEstadoBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.startedAt).toLocaleDateString("es-MX")}
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
                          label: c.status === "active" ? "Suspender" : "Reactivar",
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

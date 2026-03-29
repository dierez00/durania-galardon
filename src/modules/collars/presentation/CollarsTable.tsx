"use client";

import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Edit3, Eye } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { CollarStatusBadge } from "./CollarStatusBadge";
import type { CollarListItem, CollarSortField, CollarSortState } from "./types";
import { cn } from "@/shared/lib/utils";

interface Props {
  collars: CollarListItem[];
  sort: CollarSortState;
  onSortChange: (sort: CollarSortState) => void;
  onViewDetail?: (collarId: string) => void;
  onStatusChange?: (collar: CollarListItem) => void;
  onViewProducer?: (collar: CollarListItem) => void;
  onEdit?: (collar: CollarListItem) => void;
  showActions?: boolean;
}

interface SortableHeadProps {
  field: CollarSortField;
  sort: CollarSortState;
  onSortChange: (sort: CollarSortState) => void;
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

function SortableHead({
  field,
  sort,
  onSortChange,
  children,
  className,
}: Readonly<SortableHeadProps>) {
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
        <Icon
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            isActive ? "text-primary" : ""
          )}
        />
      </button>
    </TableHead>
  );
}

export function CollarsTable({
  collars,
  sort,
  onSortChange,
  onViewDetail,
  onStatusChange,
  onViewProducer,
  onEdit,
  showActions = true,
}: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                field="collar_id"
                sort={sort}
                onSortChange={onSortChange}
              >
                Collar ID
              </SortableHead>
              <TableHead>Productor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Firmware</TableHead>
              <SortableHead
                field="purchased_at"
                sort={sort}
                onSortChange={onSortChange}
              >
                Comprado
              </SortableHead>
              <SortableHead
                field="linked_at"
                sort={sort}
                onSortChange={onSortChange}
              >
                Vinculado
              </SortableHead>
              {showActions && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {collars.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showActions ? 7 : 6}
                  className="text-center text-muted-foreground py-8"
                >
                  No se encontraron collares.
                </TableCell>
              </TableRow>
            ) : (
              collars.map((collar) => (
                <TableRow key={collar.id}>
                  <TableCell className="font-mono font-medium">
                    {collar.collar_id}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {collar.producer_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <CollarStatusBadge status={collar.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {collar.firmware_version}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {collar.purchased_at
                      ? new Date(collar.purchased_at).toLocaleDateString("es-MX")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {collar.linked_at
                      ? new Date(collar.linked_at).toLocaleDateString("es-MX")
                      : "—"}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <TableRowActions
                        items={[
                          ...(onViewDetail
                            ? [
                                {
                                  key: "view",
                                  label: "Ver detalle",
                                  icon: Eye,
                                  onSelect: () => onViewDetail(collar.id),
                                  disabled: false,
                                } as const,
                              ]
                            : []),
                          ...(onStatusChange
                            ? [
                                {
                                  key: "status",
                                  label:
                                    collar.status === "active"
                                      ? "Desactivar"
                                      : "Activar",
                                  icon: Edit3,
                                  onSelect: () => onStatusChange(collar),
                                  disabled: false,
                                } as const,
                              ]
                            : []),
                          ...(onEdit
                            ? [
                                {
                                  key: "edit",
                                  label: "Editar collar",
                                  icon: Edit3,
                                  onSelect: () => onEdit(collar),
                                  disabled: false,
                                } as const,
                              ]
                            : []),
                          ...(onViewProducer
                            ? [
                                {
                                  key: "view_producer",
                                  label: "Ver mas",
                                  icon: Eye,
                                  onSelect: () => onViewProducer(collar),
                                  disabled: false,
                                } as const,
                              ]
                            : []),
                        ]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

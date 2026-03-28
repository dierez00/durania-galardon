"use client";

import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Edit3, Eye, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { PaginationControls } from "@/shared/ui/pagination-controls";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { AdminExportacionEstadoBadge } from "./AdminExportacionEstadoBadge";
import { cn } from "@/shared/lib/utils";
import type {
  AdminExportacion,
  AdminExportacionesSortField,
  AdminExportacionesSortState,
} from "@/modules/exportaciones/admin/domain/entities/AdminExportacionEntity";

function Check({ value }: Readonly<{ value: boolean | null }>) {
  if (value === true) return <span className="font-medium text-success">Si</span>;
  if (value === false) return <span className="font-medium text-error">No</span>;
  return <span className="text-muted-foreground">-</span>;
}

interface SortableHeadProps {
  field: AdminExportacionesSortField;
  sort: AdminExportacionesSortState;
  onSortChange: (sort: AdminExportacionesSortState) => void;
  children: ReactNode;
  className?: string;
}

function getSortIcon(isActive: boolean, dir: "asc" | "desc") {
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
        <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "")} />
      </button>
    </TableHead>
  );
}

interface Props {
  exportaciones: AdminExportacion[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sort: AdminExportacionesSortState;
  onSortChange: (sort: AdminExportacionesSortState) => void;
  onEdit?: (exportId: string) => void;
  onViewMore?: (exportId: string) => void;
  onDelete?: (exportacion: AdminExportacion) => void;
}

export function AdminExportacionesList({
  exportaciones,
  page,
  totalPages,
  onPageChange,
  sort,
  onSortChange,
  onEdit,
  onViewMore,
  onDelete,
}: Readonly<Props>) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <Card>
      <CardContent className="space-y-4 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Productor</TableHead>
              <TableHead>UPP</TableHead>
              <SortableHead field="status" sort={sort} onSortChange={onSortChange}>
                Estado
              </SortableHead>
              <TableHead className="text-center">Regla 60</TableHead>
              <TableHead className="text-center">TB/BR</TableHead>
              <TableHead className="text-center">Arete azul</TableHead>
              <SortableHead field="monthly_bucket" sort={sort} onSortChange={onSortChange}>
                Mes exp.
              </SortableHead>
              <SortableHead field="created_at" sort={sort} onSortChange={onSortChange}>
                Creada
              </SortableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exportaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No se encontraron exportaciones.
                </TableCell>
              </TableRow>
            ) : (
              exportaciones.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.producer_name ?? "-"}</TableCell>
                  <TableCell className="text-sm">{e.upp_name ?? e.upp_id ?? "-"}</TableCell>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {e.monthly_bucket
                      ? new Date(e.monthly_bucket).toLocaleDateString("es-MX", {
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(e.created_at).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell className="text-right">
                    <TableRowActions
                      items={[
                        {
                          key: "edit",
                          label: "Editar",
                          icon: Edit3,
                          onSelect: () => onEdit?.(e.id),
                          disabled: !onEdit,
                        },
                        {
                          key: "view",
                          label: "Ver mas",
                          icon: Eye,
                          onSelect: () => onViewMore?.(e.id),
                          disabled: !onViewMore,
                        },
                        {
                          key: "delete",
                          label: "Eliminar",
                          icon: Trash2,
                          onSelect: () => onDelete?.(e),
                          disabled: !onDelete,
                          variant: "destructive",
                          separatorBefore: true,
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => onPageChange(page - 1)}
            onNext={() => onPageChange(page + 1)}
            onPageChange={onPageChange}
          />
        )}
      </CardContent>
    </Card>
  );
}

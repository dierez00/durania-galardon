"use client";

import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { AdminProductorEstadoBadge } from "./AdminProductorEstadoBadge";
import type {
  AdminProductor,
  AdminProductoresSortField,
  AdminProductoresSortState,
} from "@/modules/admin/productores/domain/entities/AdminProductorEntity";
import { cn } from "@/shared/lib/utils";

interface Props {
  productores: AdminProductor[];
  sort: AdminProductoresSortState;
  onSortChange: (sort: AdminProductoresSortState) => void;
}

interface SortableHeadProps {
  field: AdminProductoresSortField;
  sort: AdminProductoresSortState;
  onSortChange: (sort: AdminProductoresSortState) => void;
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

export function AdminProductoresList({ productores, sort, onSortChange }: Readonly<Props>) {
  const router = useRouter();
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CURP</TableHead>
              <TableHead>Estado</TableHead>
              <SortableHead field="docs_validated" sort={sort} onSortChange={onSortChange} className="text-center">
                Docs validados
              </SortableHead>
              <SortableHead field="docs_pending" sort={sort} onSortChange={onSortChange} className="text-center">
                Docs pendientes
              </SortableHead>
              <SortableHead field="docs_issues" sort={sort} onSortChange={onSortChange} className="text-center">
                Docs vencidos
              </SortableHead>
              <SortableHead field="registered_at" sort={sort} onSortChange={onSortChange}>
                Registrado
              </SortableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No se encontraron productores.
                </TableCell>
              </TableRow>
            ) : (
              productores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{p.curp ?? "—"}</TableCell>
                  <TableCell>
                    <AdminProductorEstadoBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-center">{p.documents.validated}</TableCell>
                  <TableCell className="text-center">{p.documents.pending}</TableCell>
                  <TableCell className="text-center">{p.documents.expired}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(p.created_at).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/producers/${p.id}`)}
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
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

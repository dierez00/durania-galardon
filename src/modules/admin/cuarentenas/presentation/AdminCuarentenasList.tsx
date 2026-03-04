"use client";

import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { AdminCuarentenaEstadoBadge } from "./AdminCuarentenaEstadoBadge";
import type {
  AdminCuarentena,
  AdminCuarentenasSortField,
  AdminCuarentenasSortState,
} from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaEntity";
import { cn } from "@/shared/lib/utils";

interface Props {
  cuarentenas: AdminCuarentena[];
  sort: AdminCuarentenasSortState;
  onSortChange: (next: AdminCuarentenasSortState) => void;
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

export function AdminCuarentenasList({ cuarentenas, sort, onSortChange }: Readonly<Props>) {
  const router = useRouter();
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
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
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron cuarentenas.
                </TableCell>
              </TableRow>
            ) : (
              cuarentenas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.uppName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.producerName ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {c.quarantineType === "state" ? "Estatal" : "Operacional"}
                  </TableCell>
                  <TableCell>
                    <AdminCuarentenaEstadoBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.startedAt).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/quarantines/${c.id}`)}
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


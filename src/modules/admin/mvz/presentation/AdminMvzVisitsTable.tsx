"use client";

import { CalendarCheck, CheckCircle, Clock, XCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Card, CardContent } from "@/shared/ui/card";
import { DetailEmptyState } from "@/shared/ui/detail";
import { PaginationControls } from "@/shared/ui/pagination-controls";
import { cn } from "@/shared/lib/utils";
import type { AdminMvzVisit } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

interface AdminMvzVisitsTableProps {
  visits: AdminMvzVisit[];
  total: number;
  page: number;
  limit?: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

function getVisitStatusConfig(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completada", icon: CheckCircle, cls: "bg-emerald-100 text-emerald-700" };
    case "scheduled":
      return { label: "Programada", icon: Clock, cls: "bg-blue-100 text-blue-700" };
    case "cancelled":
      return { label: "Cancelada", icon: XCircle, cls: "bg-red-100 text-red-700" };
    case "in_progress":
      return { label: "En progreso", icon: RefreshCcw, cls: "bg-amber-100 text-amber-700" };
    default:
      return { label: status, icon: CalendarCheck, cls: "bg-gray-100 text-gray-500" };
  }
}

function getVisitTypeLabel(type: string): string {
  const map: Record<string, string> = {
    inspection:  "Inspección",
    vaccination: "Vacunación",
    treatment:   "Tratamiento",
    follow_up:   "Seguimiento",
  };
  return map[type] ?? type;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminMvzVisitsTable({
  visits,
  total,
  page,
  limit = 20,
  loading = false,
  onPageChange,
}: Readonly<AdminMvzVisitsTableProps>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) {
    return (
      <div className="space-y-2">
        {["a", "b", "c", "d", "e"].map((k) => (
          <div key={k} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (visits.length === 0 && !loading) {
    return (
      <DetailEmptyState
        icon={CalendarCheck}
        message="No hay visitas registradas para este MVZ."
        description="Las visitas se registran al programar o completar visitas a UPPs."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UPP / Rancho</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Programada</TableHead>
                <TableHead>Finalizada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((v) => {
                const config = getVisitStatusConfig(v.status);
                const StatusIcon = config.icon;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium text-sm">{v.uppName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getVisitTypeLabel(v.visitType)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-0 text-xs", config.cls)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(v.scheduledAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {v.finishedAt ? formatDateTime(v.finishedAt) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          canPrev={page > 1}
          canNext={page < totalPages}
          onPrev={() => onPageChange(page - 1)}
          onNext={() => onPageChange(page + 1)}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

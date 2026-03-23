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
import type { AdminProductorVisit } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

interface AdminProductorVisitsTableProps {
  visits: AdminProductorVisit[];
  total: number;
  page: number;
  limit?: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

function getVisitStatusConfig(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completada", icon: CheckCircle, tone: "success" as SemanticTone };
    case "scheduled":
      return { label: "Programada", icon: Clock, tone: "info" as SemanticTone };
    case "cancelled":
      return { label: "Cancelada", icon: XCircle, tone: "error" as SemanticTone };
    case "in_progress":
      return { label: "En progreso", icon: RefreshCcw, tone: "warning" as SemanticTone };
    default:
      return { label: status, icon: CalendarCheck, tone: "neutral" as SemanticTone };
  }
}

function getVisitTypeLabel(type: string): string {
  const map: Record<string, string> = {
    inspection: "Inspección",
    vaccination: "Vacunación",
    treatment: "Tratamiento",
    follow_up: "Seguimiento",
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

export function AdminProductorVisitsTable({
  visits,
  total,
  page,
  limit = 20,
  loading = false,
  onPageChange,
}: Readonly<AdminProductorVisitsTableProps>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) {
    return (
      <div className="space-y-2">
        {["a", "b", "c", "d", "e"].map((k) => (
          <div
            key={k}
            className="h-12 rounded-lg bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (visits.length === 0 && !loading) {
    return (
      <DetailEmptyState
        icon={CalendarCheck}
        message="No hay visitas de MVZ registradas."
        description="Las visitas se registrarán cuando los MVZ asignados realicen visitas a las UPPs."
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
                <TableHead>MVZ</TableHead>
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
                    <TableCell>
                      <div className="text-sm">{v.mvzFullName}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {v.mvzLicense}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getVisitTypeLabel(v.visitType)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs")} variant={toneToBadgeVariant[config.tone]}>
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

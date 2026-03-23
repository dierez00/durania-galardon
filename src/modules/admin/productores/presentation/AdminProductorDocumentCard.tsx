"use client";

import { FileText, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";
import type { AdminProductorDocument } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

interface AdminProductorDocumentCardProps {
  doc: AdminProductorDocument;
  className?: string;
}

function getDocStatusConfig(status: string) {
  switch (status) {
    case "approved":
      return {
        label: "Aprobado",
        icon: CheckCircle,
        tone: "success" as const,
      };
    case "pending":
      return {
        label: "Pendiente",
        icon: Clock,
        tone: "warning" as const,
      };
    case "rejected":
      return {
        label: "Rechazado",
        icon: XCircle,
        tone: "error" as const,
      };
    case "expired":
      return {
        label: "Vencido",
        icon: AlertTriangle,
        tone: "warning" as const,
      };
    default:
      return {
        label: status,
        icon: FileText,
        tone: "neutral" as SemanticTone,
      };
  }
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function AdminProductorDocumentCard({
  doc,
  className,
}: Readonly<AdminProductorDocumentCardProps>) {
  const config = getDocStatusConfig(doc.status);
  const StatusIcon = config.icon;
  const isExpiredOrRejected = doc.status === "expired" || doc.status === "rejected";

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 bg-muted/40 rounded-lg border border-border/50 hover:border-border transition-colors",
        isExpiredOrRejected && "border-error-border bg-error-bg/50",
        className
      )}
    >
      <div className="p-2 bg-background rounded-md border border-border/50 shrink-0">
        <FileText className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h4 className="text-sm font-medium truncate">{doc.documentType}</h4>
          <Badge variant={toneToBadgeVariant[config.tone]} className="text-xs shrink-0">
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground mt-2">
          <div>
            <span className="block text-[11px] mb-0.5">Subido</span>
            <span className="font-medium text-foreground">{formatDate(doc.uploadedAt)}</span>
          </div>
          {doc.expiryDate && (
            <div>
              <span className="block text-[11px] mb-0.5">Vence</span>
              <span
                className={cn(
                  "font-medium",
                  doc.status === "expired" ? "text-destructive" : "text-foreground"
                )}
              >
                {formatDate(doc.expiryDate)}
              </span>
            </div>
          )}
        </div>
        {!doc.isCurrent && (
          <p className="text-[11px] text-muted-foreground mt-1 italic">Versión anterior</p>
        )}
      </div>
    </div>
  );
}

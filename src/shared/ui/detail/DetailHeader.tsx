"use client";

import Link from "next/link";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  status?: string;
  statusLabel?: string;
  statusVariant?: string;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  toggleStatusLabel?: string;
  onDelete?: () => void;
  isTogglingStatus?: boolean;
  className?: string;
}

function getStatusBadgeClass(variant: string | undefined): string {
  switch (variant) {
    case "active":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "inactive":
    case "suspended":
      return "bg-gray-100 text-gray-500 border-gray-200";
    default:
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
}

export function DetailHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Volver",
  status,
  statusLabel,
  statusVariant,
  onEdit,
  onToggleStatus,
  toggleStatusLabel,
  onDelete,
  isTogglingStatus = false,
  className,
}: Readonly<DetailHeaderProps>) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            {status && (
              <Badge
                className={cn(
                  "border text-xs font-medium",
                  getStatusBadgeClass(statusVariant ?? status)
                )}
              >
                {statusLabel ?? status}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-1.5" />
              Editar
            </Button>
          )}
          {onToggleStatus && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleStatus}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus ? "Procesando..." : (toggleStatusLabel ?? "Cambiar estado")}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

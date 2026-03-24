"use client";

import Link from "next/link";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  status?: string;
  statusLabel?: string;
  statusVariant?: SemanticTone | string;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  toggleStatusLabel?: string;
  onDelete?: () => void;
  isTogglingStatus?: boolean;
  className?: string;
}

function resolveStatusTone(variant: string | undefined): SemanticTone {
  switch (variant) {
    case "success":
    case "active":
    case "approved":
    case "completed":
      return "success";
    case "warning":
    case "pending":
    case "suspended":
    case "in_review":
      return "warning";
    case "error":
    case "blocked":
    case "rejected":
      return "error";
    case "neutral":
    case "inactive":
    case "released":
      return "neutral";
    case "accent":
      return "accent";
    case "secondary":
      return "secondary";
    case "brand":
      return "brand";
    case "info":
    default:
      return "info";
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
              <Badge variant={toneToBadgeVariant[resolveStatusTone(statusVariant ?? status)]}>
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
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

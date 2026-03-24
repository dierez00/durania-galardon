"use client";

import { FlaskConical, Tag, Calendar } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import type { AdminMvzTest } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";
import { toneClass, toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

interface AdminMvzTestCardProps {
  test: AdminMvzTest;
  className?: string;
}

function getResultConfig(result: string): { label: string; tone: SemanticTone } {
  switch (result) {
    case "negative":
      return { label: "Negativo", tone: "success" };
    case "positive":
      return { label: "Positivo", tone: "error" };
    case "inconclusive":
      return { label: "Inconclusos", tone: "warning" };
    default:
      return { label: result, tone: "neutral" };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function AdminMvzTestCard({ test, className }: Readonly<AdminMvzTestCardProps>) {
  const resultConfig = getResultConfig(test.result);

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("shrink-0 rounded-md p-1.5", toneClass("info", "surfaceStrong"))}>
              <FlaskConical className="w-4 h-4 text-info" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{test.testTypeName}</h3>
              <span className="text-[11px] font-mono text-muted-foreground">{test.animalTag}</span>
            </div>
          </div>
          <Badge className="shrink-0 text-xs" variant={toneToBadgeVariant[resultConfig.tone]}>
            {resultConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Tag className="w-3.5 h-3.5 shrink-0" />
          <span>Animal: <span className="font-mono font-medium text-foreground">{test.animalTag}</span></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Toma de muestra: {formatDate(test.sampleDate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

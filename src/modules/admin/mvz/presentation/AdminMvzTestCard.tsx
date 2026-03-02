"use client";

import { FlaskConical, Tag, Calendar } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import type { AdminMvzTest } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

interface AdminMvzTestCardProps {
  test: AdminMvzTest;
  className?: string;
}

function getResultConfig(result: string): { label: string; cls: string } {
  switch (result) {
    case "negative":
      return { label: "Negativo", cls: "bg-emerald-100 text-emerald-700" };
    case "positive":
      return { label: "Positivo", cls: "bg-red-100 text-red-700" };
    case "inconclusive":
      return { label: "Inconclusos", cls: "bg-amber-100 text-amber-700" };
    default:
      return { label: result, cls: "bg-gray-100 text-gray-500" };
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
            <div className="p-1.5 bg-blue-100 rounded-md shrink-0">
              <FlaskConical className="w-4 h-4 text-blue-700" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{test.testTypeName}</h3>
              <span className="text-[11px] font-mono text-muted-foreground">{test.animalTag}</span>
            </div>
          </div>
          <Badge className={cn("shrink-0 border-0 text-xs", resultConfig.cls)}>
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

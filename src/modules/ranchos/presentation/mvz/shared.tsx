"use client";

import { LayoutGrid, TableProperties } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/ui/toggle-group";
import { cn } from "@/shared/lib/utils";
import { toneClass, type SemanticTone } from "@/shared/ui/theme";
import type { MvzCollectionViewMode } from "./types";

export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return <p className="text-sm text-destructive">{message}</p>;
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="font-medium">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: MvzCollectionViewMode;
  onChange: (mode: MvzCollectionViewMode) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={mode}
      variant="outline"
      onValueChange={(value) => {
        if (value === "table" || value === "card") {
          onChange(value);
        }
      }}
    >
      <ToggleGroupItem value="table" aria-label="Vista de tabla">
        <TableProperties className="mr-1 h-4 w-4" />
        Tabla
      </ToggleGroupItem>
      <ToggleGroupItem value="card" aria-label="Vista de tarjetas">
        <LayoutGrid className="mr-1 h-4 w-4" />
        Tarjetas
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function StatusChip({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "stable" | "attention" | "critical";
}) {
  const semanticTone: SemanticTone =
    tone === "stable"
      ? "success"
      : tone === "attention"
        ? "warning"
        : tone === "critical"
          ? "error"
          : "neutral";

  return <Badge className={cn("border", toneClass(semanticTone, "chip"))}>{label}</Badge>;
}

export function PrimaryActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button size="sm" onClick={onClick}>
      {label}
    </Button>
  );
}

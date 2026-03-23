"use client";

import { Home, MapPin, Beef, Layers } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { toneClass, toneToBadgeVariant } from "@/shared/ui/theme";
import { AdminProductorMvzChip } from "./AdminProductorMvzChip";
import type { AdminProductorUpp } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

interface AdminProductorUppCardProps {
  upp: AdminProductorUpp;
  className?: string;
}

export function AdminProductorUppCard({
  upp,
  className,
}: Readonly<AdminProductorUppCardProps>) {
  const isActive = upp.status === "active";

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow border",
        isActive ? "border-border" : "border-border/50 opacity-70",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("p-1.5 rounded-md shrink-0 border", toneClass("accent", "surfaceStrong"))}>
              <Home className={cn("w-4 h-4", toneClass("accent", "icon"))} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{upp.name}</h3>
              {upp.uppCode && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {upp.uppCode}
                </span>
              )}
            </div>
          </div>
          <Badge variant={toneToBadgeVariant[isActive ? "success" : "neutral"]} className="shrink-0 text-xs">
            {isActive ? "Activa" : "Inactiva"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
            <Beef className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-base font-bold">{upp.animalCount}</span>
            <span className="text-[10px] text-muted-foreground">Bovinos</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
            <Layers className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-base font-bold">
              {upp.hectaresTotal === null
                ? "—"
                : upp.hectaresTotal.toFixed(0)}
            </span>
            <span className="text-[10px] text-muted-foreground">Hectáreas</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
            <Beef className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-base font-bold">
              {upp.herdLimit ?? "—"}
            </span>
            <span className="text-[10px] text-muted-foreground">Límite</span>
          </div>
        </div>

        {/* Location */}
        {upp.addressText && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{upp.addressText}</span>
          </div>
        )}

        {/* MVZ assignments */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            MVZ Asignados
          </p>
          {upp.mvzAssignments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {upp.mvzAssignments.map((mvz) => (
                <AdminProductorMvzChip key={mvz.mvzProfileId} mvz={mvz} />
              ))}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>
              Aún no asignado
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

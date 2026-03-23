"use client";

import { Home, MapPin, Beef, User, X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { AdminMvzUpp } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";
import { toneClass } from "@/shared/ui/theme";

interface AdminMvzUppCardProps {
  upp: AdminMvzUpp;
  className?: string;
  /** When provided an X / unassign button is rendered top-right */
  onUnassign?: () => void;
}

export function AdminMvzUppCard({ upp, className, onUnassign }: Readonly<AdminMvzUppCardProps>) {
  const isActive = upp.status === "active";

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow border group",
        isActive ? "border-border" : "border-border/50 opacity-70",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("shrink-0 rounded-md p-1.5", toneClass("accent", "surfaceStrong"))}>
              <Home className="w-4 h-4 text-highlight" />
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
          <div className="flex items-center gap-1 shrink-0">
            <Badge className="text-xs" variant={isActive ? "success" : "neutral"}>
              {isActive ? "Activa" : "Inactiva"}
            </Badge>
            {onUnassign && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={onUnassign}
                title="Desasignar rancho"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
            <Beef className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-base font-bold">{upp.animalCount}</span>
            <span className="text-[10px] text-muted-foreground">Bovinos</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
            <User className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-[11px] font-medium text-center leading-tight mt-0.5 line-clamp-2">
              {upp.producerName ?? "—"}
            </span>
            <span className="text-[10px] text-muted-foreground">Productor</span>
          </div>
        </div>

        {/* Location */}
        {upp.addressText && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{upp.addressText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

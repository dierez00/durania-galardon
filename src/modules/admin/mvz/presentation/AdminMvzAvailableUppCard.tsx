"use client";

import { Home, MapPin, Beef, User, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { AdminMvzAvailableUpp } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

interface AdminMvzAvailableUppCardProps {
  upp: AdminMvzAvailableUpp;
  onAssign: () => void;
  className?: string;
}

export function AdminMvzAvailableUppCard({
  upp,
  onAssign,
  className,
}: Readonly<AdminMvzAvailableUppCardProps>) {
  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow border border-border group",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-blue-50 rounded-md shrink-0">
              <Home className="w-4 h-4 text-blue-600" />
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
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
            onClick={onAssign}
            title="Asignar rancho"
          >
            <Plus className="w-4 h-4" />
          </Button>
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

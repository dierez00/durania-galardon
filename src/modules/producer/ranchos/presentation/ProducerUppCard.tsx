"use client";

import Link from "next/link";
import { MapPin, MapPinOff } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ProducerUpp } from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";
import { buildMapHref, statusBadgeClass, statusLabel } from "./utils/cardHelpers";

interface ProducerUppCardProps {
  readonly upp: ProducerUpp;
}

export function ProducerUppCard({ upp }: ProducerUppCardProps) {
  const mapHref = buildMapHref(upp);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">{upp.name}</CardTitle>
        <CardDescription>
          {upp.upp_code ?? upp.id.slice(0, 8)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="truncate">
              <span className="font-medium text-foreground">Dirección:</span>{" "}
              {upp.address_text ?? <span className="italic">Sin registrar</span>}
            </p>
          </div>
          <div>
            <p>
              <span className="font-medium text-foreground">Hectáreas:</span>{" "}
              {upp.hectares_total ?? "—"}
            </p>
          </div>
          <div>
            <p>
              <span className="font-medium text-foreground">Límite hato:</span>{" "}
              {upp.herd_limit ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`border ${statusBadgeClass(upp.status)}`}>
            {statusLabel(upp.status)}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/producer/projects/${upp.id}`}>Entrar al rancho</Link>
          </Button>
          {mapHref ? (
            <Button
              variant="outline"
              size="icon"
              asChild
              title={
                upp.location_lat != null
                  ? "Ver coordenadas GPS en Maps"
                  : "Ver dirección en Maps"
              }
            >
              <a href={mapHref} target="_blank" rel="noopener noreferrer">
                <MapPin className="w-4 h-4" />
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              disabled
              title="Sin ubicación registrada"
            >
              <MapPinOff className="w-4 h-4 text-muted-foreground/40" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

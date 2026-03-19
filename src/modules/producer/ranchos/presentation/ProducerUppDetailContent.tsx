"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DetailHeader } from "@/shared/ui/detail/DetailHeader";
import { DetailInfoGrid } from "@/shared/ui/detail/DetailInfoGrid";
import { Skeleton } from "@/shared/ui/skeleton";
import type { ProducerUpp } from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";

interface ProducerUppDetailContentProps {
  readonly upp: ProducerUpp;
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Activo";
    case "quarantined":
      return "Cuarentena";
    case "suspended":
      return "Suspendido";
    default:
      return status;
  }
}

function statusVariant(status: string): string {
  switch (status) {
    case "active":
      return "active";
    case "quarantined":
      return "warning";
    default:
      return "inactive";
  }
}

function buildMapHref(upp: ProducerUpp): string | null {
  if (upp.location_lat != null && upp.location_lng != null) {
    return `https://www.google.com/maps?q=${upp.location_lat},${upp.location_lng}`;
  }
  if (upp.address_text) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upp.address_text)}`;
  }
  return null;
}

export function ProducerUppDetailContent({ upp }: ProducerUppDetailContentProps) {
  const mapHref = buildMapHref(upp);

  const infoItems = [
    {
      label: "Código UPP",
      value: upp.upp_code ?? "—",
    },
    {
      label: "Nombre",
      value: upp.name,
    },
    {
      label: "Dirección",
      value: upp.address_text ?? "—",
    },
    {
      label: "Coordenadas GPS",
      value:
        upp.location_lat != null && upp.location_lng != null
          ? `${upp.location_lat}, ${upp.location_lng}`
          : "—",
    },
    {
      label: "Hectáreas totales",
      value: upp.hectares_total != null ? `${upp.hectares_total} ha` : "—",
    },
    {
      label: "Límite de hato",
      value: upp.herd_limit != null ? `${upp.herd_limit} cabezas` : "—",
    },
    {
      label: "Registrado",
      value: new Date(upp.created_at).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
  ];

  return (
    <div className="space-y-6">
      <DetailHeader
        title={upp.name}
        subtitle={upp.upp_code ? `Código UPP: ${upp.upp_code}` : undefined}
        backHref="/producer"
        backLabel="Ranchos / UPPs"
        status={upp.status}
        statusLabel={statusLabel(upp.status)}
        statusVariant={statusVariant(upp.status)}
      />

      {mapHref && (
        <div className="flex">
          <Button variant="outline" size="sm" asChild>
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Ver en Google Maps
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
          </Button>
        </div>
      )}

      <DetailInfoGrid items={infoItems} columns={2} />
    </div>
  );
}

export function ProducerUppDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-9 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

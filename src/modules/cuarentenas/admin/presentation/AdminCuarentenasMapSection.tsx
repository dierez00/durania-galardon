"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import type { AdminCuarentenaMapPoint } from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaDetailEntity";

interface LeafletMapProps {
  points: AdminCuarentenaMapPoint[];
  onMarkerClick: (id: string) => void;
}

// Leaflet no soporta SSR â€” carga diferida obligatoria en Next.js App Router
const LeafletMap = dynamic<LeafletMapProps>(
  () =>
    import("./CuarentenasLeafletMap").then(
      (mod) => mod.default as ComponentType<LeafletMapProps>
    ),
  { ssr: false }
);

interface Props {
  points: AdminCuarentenaMapPoint[];
  loading?: boolean;
}

export function AdminCuarentenasMapSection({ points, loading }: Readonly<Props>) {
  const router = useRouter();

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-sm">Mapa de cuarentenas activas</h2>
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse">Cargando puntosâ€¦</span>
        )}
      </div>
      <div className="h-72 w-full">
        <LeafletMap
          points={points}
          onMarkerClick={(id) => router.push(`/admin/quarantines/${id}`)}
        />
      </div>
    </div>
  );
}


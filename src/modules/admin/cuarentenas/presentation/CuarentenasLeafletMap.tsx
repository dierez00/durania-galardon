"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { AdminCuarentenaMapPoint } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaDetailEntity";

// Icono custom por color (sin require de archivos de imagen)
function createColorIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 0 4px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

const STATUS_COLORS: Record<string, string> = {
  active:    "#22c55e",   // verde
  released:  "#6b7280",   // gris
  suspended: "#f97316",   // naranja
};

const STATUS_LABELS: Record<string, string> = {
  active:    "Activa",
  released:  "Liberada",
  suspended: "Suspendida",
};

interface Props {
  points: AdminCuarentenaMapPoint[];
  onMarkerClick: (id: string) => void;
}

export default function CuarentenasLeafletMap({ points, onMarkerClick }: Readonly<Props>) {
  // Neutraliza el ícono por defecto roto de Webpack
  useEffect(() => {
    // @ts-expect-error — propiedad interna de Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <MapContainer
      center={[23.6345, -102.5528]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={createColorIcon(STATUS_COLORS[p.status] ?? "#6b7280")}
          eventHandlers={{ click: () => onMarkerClick(p.id) }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
            <div className="text-xs space-y-0.5">
              <p className="font-semibold">{p.title}</p>
              {p.uppName && <p>{p.uppName}</p>}
              {p.producerName && <p>{p.producerName}</p>}
              <p>{STATUS_LABELS[p.status] ?? p.status}</p>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

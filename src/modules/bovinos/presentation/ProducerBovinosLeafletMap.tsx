"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";

export interface ProducerAnimalMapPoint {
  id: string;
  uppId: string;
  lat: number;
  lng: number;
  siniigaTag: string;
  name: string | null;
  healthStatus: string | null;
  collarId: string | null;
  timestamp: string | null;
  batteryPercent: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "var(--success)",
  observation: "var(--warning)",
  quarantine: "var(--destructive)",
};

function createColorIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${color};border:2px solid var(--background);
      box-shadow:0 0 0 2px var(--border);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

interface ProducerBovinosLeafletMapProps {
  points: ProducerAnimalMapPoint[];
  onMarkerClick: (animalId: string) => void;
}

export default function ProducerBovinosLeafletMap({
  points,
  onMarkerClick,
}: Readonly<ProducerBovinosLeafletMapProps>) {
  useEffect(() => {
    // @ts-expect-error Leaflet internal property
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const center: [number, number] = points.length > 0
    ? [points[0].lat, points[0].lng]
    : [23.6345, -102.5528];
  const zoom = points.length > 0 ? 12 : 5;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={createColorIcon(STATUS_COLORS[point.healthStatus ?? ""] ?? "var(--neutral)")}
          eventHandlers={{ click: () => onMarkerClick(point.id) }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold">{point.name ?? "Sin nombre"}</p>
              <p className="font-mono">SINIIGA: {point.siniigaTag}</p>
              {point.collarId ? <p>Collar: {point.collarId}</p> : null}
              {point.batteryPercent !== null ? <p>Bateria: {point.batteryPercent}%</p> : null}
              {point.timestamp ? <p>Ultima lectura: {new Date(point.timestamp).toLocaleString("es-MX")}</p> : null}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
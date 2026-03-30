"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";

export interface BovinoActivityPoint {
  id: string;
  lat: number;
  lng: number;
  timestamp: string | null;
  batteryPercent: number | null;
}

function createTrackPointIcon(isStart: boolean, isEnd: boolean) {
  const color = isStart ? "var(--success)" : isEnd ? "var(--primary)" : "var(--warning)";

  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid var(--background);
      box-shadow:0 0 0 2px var(--border);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

interface BovinoActivityHistoryLeafletMapProps {
  points: BovinoActivityPoint[];
}

export default function BovinoActivityHistoryLeafletMap({
  points,
}: Readonly<BovinoActivityHistoryLeafletMapProps>) {
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
    ? [points[points.length - 1].lat, points[points.length - 1].lng]
    : [23.6345, -102.5528];
  const zoom = points.length > 0 ? 13 : 5;

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

      <Polyline
        positions={points.map((point) => [point.lat, point.lng] as [number, number])}
        pathOptions={{ color: "var(--primary)", weight: 3, opacity: 0.75 }}
      />

      {points.map((point, index) => {
        const isStart = index === 0;
        const isEnd = index === points.length - 1;
        return (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={createTrackPointIcon(isStart, isEnd)}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="space-y-0.5 text-xs">
                <p className="font-medium">Punto #{index + 1}</p>
                {point.timestamp ? <p>{new Date(point.timestamp).toLocaleString("es-MX")}</p> : null}
                {point.batteryPercent !== null ? <p>Bateria: {point.batteryPercent}%</p> : null}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
import type { AdminCuarentenaStatus, AdminCuarentenaType } from "./AdminCuarentenaEntity";

/** Detalle completo de una cuarentena */
export interface AdminCuarentenaDetallada {
  id: string;
  title: string;
  uppId: string | null;
  status: AdminCuarentenaStatus;
  quarantineType: AdminCuarentenaType;
  reason: string | null;
  epidemiologicalNote: string | null;
  geojson: Record<string, unknown> | null;
  startedAt: string;
  releasedAt: string | null;
  createdAt: string;
  createdByUserId: string | null;
  releasedByUserId: string | null;
  // Datos de UPP (si hay asignación)
  uppName: string | null;
  uppCode: string | null;
  addressText: string | null;
  locationLat: number | null;
  locationLng: number | null;
  producerName: string | null;
  animalCount: number;
}

/** Punto en el mapa nacional de cuarentenas */
export interface AdminCuarentenaMapPoint {
  id: string;
  title: string;
  status: AdminCuarentenaStatus;
  quarantineType: AdminCuarentenaType;
  lat: number;
  lng: number;
  uppName: string | null;
  producerName: string | null;
}

/** Rancho disponible en el flujo de activación contextual */
export interface AdminCuarentenaActivationContextItem {
  uppId: string;
  uppCode: string | null;
  uppName: string;
  addressText: string | null;
  locationLat: number | null;
  locationLng: number | null;
  producerName: string;
  totalAnimals: number;
  activeAnimals: number;
  hasActiveQuarantine: boolean;
  activeQuarantineTitle: string | null;
}

export interface TelemetryRecord {
  id: number;
  collar_uuid: string;
  collar_id: string;
  tenant_id?: string | null;
  animal_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  speed?: number | null;
  temperature?: number | null;
  activity?: string | null;
  bat_voltage?: number | null;
  bat_percent?: number | null;
  accel_x?: number | null;
  accel_y?: number | null;
  accel_z?: number | null;
  gyro_x?: number | null;
  gyro_y?: number | null;
  gyro_z?: number | null;
  rssi?: number | null;
  snr?: number | null;
  timestamp: string; // ISO o timestamptz
}

export interface TelemetrySnapshot {
  collarId: string;
  animalId?: string | null;
  position?: {
    lat: number;
    lng: number;
    alt?: number | null;
  };
  battery?: {
    percent?: number | null;
    voltage?: number | null;
  };
  activity?: string | null;
  rssi?: number | null;
  snr?: number | null;
  timestamp: string;
}

export interface TelemetryHistoryQuery {
  from?: string; // ISO date
  to?: string;   // ISO date
  limit?: number;
  page?: number;
}

export interface TelemetryHistoryResponse {
  data: TelemetrySnapshot[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

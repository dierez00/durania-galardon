export interface BovinoPrueba {
  fecha: string;
  tuberculosis: string;
  brucelosis: string;
  mvz: string;
  resultado: string;
}

export interface BovinoCuarentena {
  inicio: string;
  motivo: string;
  estado: string;
}

export interface BovinoExportacion {
  solicitud: string;
  fecha: string;
  destino: string;
  estado: string;
}

export interface Bovino {
  id: number;
  arete: string;
  sexo: string;
  raza: string;
  peso: number;
  nacimiento: string;
  rancho: string;
  productor: string;
  sanitario: string;
  pruebas?: BovinoPrueba[];
  cuarentenas?: BovinoCuarentena[];
  exportaciones?: BovinoExportacion[];
}

export interface BovinosFiltersState {
  search: string;
  sexo: string;
  sanitario: string;
  fechaDesde: string;
  fechaHasta: string;
}

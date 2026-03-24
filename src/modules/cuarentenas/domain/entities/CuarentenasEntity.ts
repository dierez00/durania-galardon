export interface Cuarentena {
  id: number;
  bovino: string;
  rancho: string;
  mvz: string;
  inicio: string;
  prevista: string;
  real: string;
  estado: string;
  progreso: number;
  observaciones: string;
}

export interface CuarentenasFiltersState {
  search: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
}


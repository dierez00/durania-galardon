export interface Rancho {
  id: number;
  nombre: string;
  productor: string;
  municipio: string;
  localidad: string;
  coords: string;
  bovinos: number;
  estado: string;
  fechaRegistro: string;
}

export interface RanchosFiltersState {
  search: string;
  municipio: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
}


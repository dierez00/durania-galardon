export interface Productor {
  id: number;
  nombre: string;
  curp: string;
  rfc: string;
  municipio: string;
  ranchos: number;
  bovinos: number;
  estado: string;
  fechaRegistro: string;
}

export interface ProductoresFiltersState {
  search: string;
  municipio: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
}


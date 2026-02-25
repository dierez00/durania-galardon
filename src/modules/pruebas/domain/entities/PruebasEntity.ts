export interface PruebaSanitaria {
  id: number;
  fecha: string;
  mvz: string;
  supervisor: string;
  lugar: string;
  motivo: string;
  tb: string;
  br: string;
  resultado: string;
  estado: string;
}

export interface PruebasFiltersState {
  search: string;
  motivo: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
}


export interface Exportacion {
  id: number;
  arete: string;
  productor: string;
  rancho: string;
  mvz: string;
  prueba: string;
  reactor: string;
  areteAzul: string;
  estado: string;
}

export interface ExportacionesFiltersState {
  search: string;
  estado: string;
  reactor: string;
  fechaDesde: string;
  fechaHasta: string;
}


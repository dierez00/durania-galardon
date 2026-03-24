export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  ultimo: string;
}

export interface UsersFiltersState {
  search: string;
  role: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
}

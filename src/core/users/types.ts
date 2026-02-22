// ─── Entidad de dominio ───────────────────────────────────────────────────────
export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  /** Fecha de último acceso en formato ISO YYYY-MM-DD */
  ultimo: string;
}

// ─── Estado de filtros ────────────────────────────────────────────────────────
export type UsersFiltersState = {
  search: string;
  role: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
};

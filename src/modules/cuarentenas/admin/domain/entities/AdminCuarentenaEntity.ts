export type AdminCuarentenaStatus = "active" | "released" | "suspended";
export type AdminCuarentenaType   = "state" | "operational";

/** Item del listado paginado */
export interface AdminCuarentena {
  id: string;
  title: string;
  uppId: string | null;
  uppName: string | null;
  producerName: string | null;
  status: AdminCuarentenaStatus;
  quarantineType: AdminCuarentenaType;
  startedAt: string;
  releasedAt: string | null;
}

export interface AdminCuarentenasFiltersState {
  search: string;
  status: string;
  quarantineType: string;
  /** ISO date string "YYYY-MM-DD" o "" */
  dateFrom: string;
  /** ISO date string "YYYY-MM-DD" o "" */
  dateTo: string;
}

export interface AdminCuarentenasPaginationState {
  page: number;
  limit: number;
  total: number;
}

export type AdminCuarentenasSortField = "started_at" | "status" | "quarantine_type";
export type AdminCuarentenasSortDir   = "asc" | "desc";

export interface AdminCuarentenasSortState {
  field: AdminCuarentenasSortField;
  dir: AdminCuarentenasSortDir;
}


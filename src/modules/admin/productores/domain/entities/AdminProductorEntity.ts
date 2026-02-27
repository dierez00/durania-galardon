export interface AdminProductor {
  id: string;
  full_name: string;
  curp: string | null;
  status: string;
  created_at: string;
  documents: {
    validated: number;
    pending: number;
    expired: number;
  };
}

export interface AdminProductoresFiltersState {
  search: string;
  status: string;
  /** ISO date string "YYYY-MM-DD" o "" */
  dateFrom: string;
  /** ISO date string "YYYY-MM-DD" o "" */
  dateTo: string;
}

export interface AdminProductoresPaginationState {
  page: number;
  limit: number;
  total: number;
}

export type AdminProductoresSortField =
  | "registered_at"
  | "docs_validated"
  | "docs_pending"
  | "docs_issues";

export type AdminProductoresSortDir = "asc" | "desc";

export interface AdminProductoresSortState {
  field: AdminProductoresSortField;
  dir: AdminProductoresSortDir;
}

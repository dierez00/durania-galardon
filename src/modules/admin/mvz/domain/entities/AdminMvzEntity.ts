export interface AdminMvz {
  id: string;
  user_id: string;
  full_name: string;
  license_number: string;
  status: string;
  assignedUpps: number;
  registeredTests: number;
  created_at: string;
}

export interface AdminMvzFiltersState {
  search: string;
  status: string;
  /** ISO date string "YYYY-MM-DD" o "" */
  dateFrom: string;
  /** ISO date string "YYYY-MM-DD" o "" */
  dateTo: string;
}

export interface AdminMvzPaginationState {
  page: number;
  limit: number;
  total: number;
}

export type AdminMvzSortField =
  | "registered_at"
  | "active_assignments"
  | "tests_last_year";

export type AdminMvzSortDir = "asc" | "desc";

export interface AdminMvzSortState {
  field: AdminMvzSortField;
  dir: AdminMvzSortDir;
}

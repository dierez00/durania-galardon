export interface AdminCuarentena {
  id: string;
  title: string;
  upp_id: string | null;
  status: string;
  quarantine_type: string;
  started_at: string;
}

export interface AdminCuarentenasFiltersState {
  search: string;
  status: string;
  quarantine_type: string;
}

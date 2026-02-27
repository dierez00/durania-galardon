export interface AuditoriaLog {
  id: string;
  actor_user_id: string | null;
  role_key: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  created_at: string;
}

export interface AuditoriaFiltersState {
  search: string;
  action: string;
  resource: string;
}

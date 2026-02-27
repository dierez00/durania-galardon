export interface NormativaSetting {
  id: string;
  key: string;
  value_json: Record<string, unknown>;
  effective_from: string;
  effective_until: string | null;
  status: string;
}

export interface NormativaFiltersState {
  search: string;
  status: string;
}

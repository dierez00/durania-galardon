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
}

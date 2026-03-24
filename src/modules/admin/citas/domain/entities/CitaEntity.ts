export type CitaStatus = "requested" | "contacted" | "scheduled" | "discarded";

export interface Cita {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  requested_service: string;
  requested_date: string | null;
  requested_time: string | null;
  notes: string | null;
  status: CitaStatus;
  created_at: string;
}

export interface CitasFiltersState {
  search: string;
  status: string;
}

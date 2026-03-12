export interface BovinoSanitaryIncident {
  id: string;
  animal_id: string;
  incident_type: string;
  severity: string;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  description: string | null;
  resolution_notes: string | null;
  mvz_name: string | null;
  created_at: string;
}

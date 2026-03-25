import type { MvzRanchReportRow } from "@/modules/ranchos/application/use-cases/normalizeMvzRanchReports";

export interface RanchOverview {
  upp_id: string;
  upp_name: string;
  upp_code: string | null;
  upp_status: string;
  producer_name: string;
  address_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  sanitary_alert: string | null;
  total_animals: number;
  active_animals: number;
  animals_in_treatment: number;
  pending_vaccinations: number;
  incidents_registered: number;
  active_incidents: number;
  total_visits: number;
  last_visit_at: string | null;
  last_inspection_at: string | null;
}

export interface MvzRanchAnimalRecord {
  animal_id: string;
  upp_id: string;
  tenant_id: string;
  siniiga_tag: string;
  name: string | null;
  sex: "M" | "F";
  birth_date: string | null;
  breed: string | null;
  weight_kg: number | null;
  age_years: number | null;
  health_status: string | null;
  last_vaccine_at: string | null;
  animal_status: string;
  mother_animal_id: string | null;
  current_collar_uuid: string | null;
  current_collar_id: string | null;
  current_collar_status: string | null;
  current_collar_linked_at: string | null;
  upp_name: string;
  upp_code: string | null;
  tb_date: string | null;
  tb_result: string | null;
  tb_valid_until: string | null;
  tb_status: string | null;
  br_date: string | null;
  br_result: string | null;
  br_valid_until: string | null;
  br_status: string | null;
  sanitary_alert: string | null;
}

export interface MvzRanchClinicalRecord {
  id: string;
  animal_id: string;
  upp_id: string;
  test_type_id: string;
  sample_date: string;
  result: string;
  valid_until: string | null;
  captured_lat: number | null;
  captured_lng: number | null;
  created_at: string;
}

export interface MvzRanchIncidentRecord {
  id: string;
  tenant_id: string;
  upp_id: string;
  animal_id: string;
  incident_type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "dismissed";
  detected_at: string;
  resolved_at: string | null;
  description: string | null;
  resolution_notes: string | null;
  reported_by_mvz_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MvzRanchVaccinationRecord {
  id: string;
  tenant_id: string;
  upp_id: string;
  animal_id: string;
  vaccine_name: string;
  dose: string | null;
  status: "pending" | "applied" | "overdue" | "cancelled";
  applied_at: string | null;
  due_at: string | null;
  applied_by_mvz_profile_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MvzRanchDocumentRecord {
  id: string;
  tenant_id: string;
  upp_id: string;
  document_type: string;
  file_storage_key: string;
  file_hash: string;
  status: "pending" | "validated" | "expired" | "rejected";
  issued_at: string | null;
  expiry_date: string | null;
  uploaded_by_user_id: string | null;
  is_current: boolean;
  uploaded_at: string;
  updated_at: string;
}

export interface MvzRanchVisitRecord {
  id: string;
  tenant_id: string;
  upp_id: string;
  mvz_profile_id: string | null;
  visit_type: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type MvzRanchTab =
  | "resumen"
  | "animales"
  | "historial-clinico"
  | "vacunacion"
  | "incidencias"
  | "reportes"
  | "documentacion"
  | "visitas";

export interface MvzRanchTabConfig {
  id: MvzRanchTab;
  label: string;
  path: string;
}

export interface MvzRanchTabProps {
  uppId: string;
  overview: RanchOverview;
  refreshKey: number;
}

export type MvzCollectionViewMode = "table" | "card";

export type { MvzRanchReportRow };

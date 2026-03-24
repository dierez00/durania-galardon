export type AdminExportacionStatus =
  | "requested"
  | "mvz_validated"
  | "final_approved"
  | "blocked"
  | "rejected";

export interface AdminExportacionMetrics {
  total_animals?: number;
  animal_ids?: string[];
  validated_animals?: number;
  [key: string]: unknown;
}

export interface AdminExportacion {
  id: string;
  producer_id: string | null;
  upp_id: string | null;
  producer_name: string | null;
  upp_name: string | null;
  status: AdminExportacionStatus;
  compliance_60_rule: boolean | null;
  tb_br_validated: boolean | null;
  blue_tag_assigned: boolean | null;
  monthly_bucket: string | null;
  metrics_json: AdminExportacionMetrics | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AdminExportacionesFiltersState {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export type AdminExportacionesSortField = "created_at" | "status" | "monthly_bucket";
export type AdminExportacionesSortDir = "asc" | "desc";

export interface AdminExportacionesSortState {
  field: AdminExportacionesSortField;
  dir: AdminExportacionesSortDir;
}

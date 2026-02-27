export interface AdminExportacion {
  id: string;
  upp_id: string | null;
  status: string;
  compliance_60_rule: boolean | null;
  tb_br_validated: boolean | null;
  blue_tag_assigned: boolean | null;
  blocked_reason: string | null;
  created_at: string;
}

export interface AdminExportacionesFiltersState {
  search: string;
  status: string;
}

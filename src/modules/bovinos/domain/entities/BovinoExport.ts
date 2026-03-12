export interface BovinoExport {
  id: string;
  upp_id: string;
  status: string;
  compliance_60_rule: boolean | null;
  tb_br_validated: boolean | null;
  blue_tag_assigned: boolean | null;
  monthly_bucket: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

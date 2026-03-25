export interface BovinoSanitary {
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

export interface Bovino {
  id: string;
  upp_id: string;
  siniiga_tag: string;
  name: string | null;
  sex: "M" | "F";
  birth_date: string | null;
  breed: string | null;
  weight_kg: number | null;
  age_years: number | null;
  health_status: string | null;
  last_vaccine_at: string | null;
  status: string;
  mother_animal_id: string | null;
  current_collar_uuid: string | null;
  current_collar_id: string | null;
  current_collar_status: string | null;
  current_collar_linked_at: string | null;
  upp_name: string;
  upp_code: string | null;
  upp_status: string;
  sanitary: BovinoSanitary;
  canExport: boolean;
}

export interface BovinosFiltersState {
  search: string;
  sexo: string;
  sanitario: string;
  exportable: string;
  fechaDesde: string;
  fechaHasta: string;
}

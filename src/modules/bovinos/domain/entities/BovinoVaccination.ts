export interface BovinoVaccination {
  id: string;
  animal_id: string;
  vaccine_name: string;
  dose: string | null;
  status: string;
  applied_at: string | null;
  due_at: string | null;
  mvz_name: string | null;
  notes: string | null;
  created_at: string;
}

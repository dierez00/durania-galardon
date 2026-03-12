export interface BovinoFieldTest {
  id: string;
  animal_id: string;
  test_type_key: "tb" | "br" | string;
  test_type_name: string;
  sample_date: string;
  result: string;
  valid_until: string | null;
  mvz_name: string | null;
  captured_lat: number | null;
  captured_lng: number | null;
  created_at: string;
}

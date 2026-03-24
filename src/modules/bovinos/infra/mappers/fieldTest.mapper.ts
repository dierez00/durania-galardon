import type { BovinoFieldTest } from "../../domain/entities/BovinoFieldTest";

export interface FieldTestApiRecord {
  id: string;
  animal_id: string;
  test_type_key: string;
  test_type_name: string;
  sample_date: string;
  result: string;
  valid_until: string | null;
  mvz_name: string | null;
  captured_lat: number | null;
  captured_lng: number | null;
  created_at: string;
}

export function toDomainFieldTest(record: FieldTestApiRecord): BovinoFieldTest {
  return {
    id: record.id,
    animal_id: record.animal_id,
    test_type_key: record.test_type_key,
    test_type_name: record.test_type_name,
    sample_date: record.sample_date,
    result: record.result,
    valid_until: record.valid_until,
    mvz_name: record.mvz_name,
    captured_lat: record.captured_lat,
    captured_lng: record.captured_lng,
    created_at: record.created_at,
  };
}

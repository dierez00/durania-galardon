import type { Bovino, BovinoSanitary } from "../../domain/entities/Bovino";
import { checkExportability } from "../../domain/services/checkExportability";

// Raw shape from /api/producer/bovinos and /api/producer/bovinos/[id]
export interface BovinoApiRecord {
  id: string;
  upp_id: string;
  siniiga_tag: string;
  name?: string | null;
  sex: "M" | "F";
  birth_date: string | null;
  breed?: string | null;
  weight_kg?: number | null;
  age_years?: number | null;
  health_status?: string | null;
  last_vaccine_at?: string | null;
  status: string;
  mother_animal_id: string | null;
  current_collar_uuid?: string | null;
  current_collar_id?: string | null;
  current_collar_status?: string | null;
  current_collar_linked_at?: string | null;
  upp_name: string;
  upp_code: string | null;
  upp_status: string;
  sanitary: {
    tb_date?: string | null;
    tb_result: string | null;
    tb_valid_until?: string | null;
    tb_status: string | null;
    br_date?: string | null;
    br_result: string | null;
    br_valid_until?: string | null;
    br_status: string | null;
    alert: string | null;
  };
}

export function toDomainBovino(record: BovinoApiRecord): Bovino {
  const sanitary: BovinoSanitary = {
    tb_date: record.sanitary.tb_date ?? null,
    tb_result: record.sanitary.tb_result,
    tb_valid_until: record.sanitary.tb_valid_until ?? null,
    tb_status: record.sanitary.tb_status,
    br_date: record.sanitary.br_date ?? null,
    br_result: record.sanitary.br_result,
    br_valid_until: record.sanitary.br_valid_until ?? null,
    br_status: record.sanitary.br_status,
    sanitary_alert: record.sanitary.alert,
  };

  const bovino: Bovino = {
    id: record.id,
    upp_id: record.upp_id,
    siniiga_tag: record.siniiga_tag,
    name: record.name ?? null,
    sex: record.sex,
    birth_date: record.birth_date,
    breed: record.breed ?? null,
    weight_kg: record.weight_kg ?? null,
    age_years: record.age_years ?? null,
    health_status: record.health_status ?? null,
    last_vaccine_at: record.last_vaccine_at ?? null,
    status: record.status,
    mother_animal_id: record.mother_animal_id,
    current_collar_uuid: record.current_collar_uuid ?? null,
    current_collar_id: record.current_collar_id ?? null,
    current_collar_status: record.current_collar_status ?? null,
    current_collar_linked_at: record.current_collar_linked_at ?? null,
    upp_name: record.upp_name ?? "",
    upp_code: record.upp_code,
    upp_status: record.upp_status ?? "active",
    sanitary,
    canExport: false, // will be computed below
  };

  bovino.canExport = checkExportability(bovino);
  return bovino;
}

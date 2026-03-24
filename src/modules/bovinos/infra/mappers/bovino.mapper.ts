import type { Bovino, BovinoSanitary } from "../../domain/entities/Bovino";
import { checkExportability } from "../../domain/services/checkExportability";

// Raw shape from /api/producer/bovinos and /api/producer/bovinos/[id]
export interface BovinoApiRecord {
  id: string;
  upp_id: string;
  siniiga_tag: string;
  sex: "M" | "F";
  birth_date: string | null;
  status: string;
  mother_animal_id: string | null;
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
    sex: record.sex,
    birth_date: record.birth_date,
    status: record.status,
    mother_animal_id: record.mother_animal_id,
    upp_name: record.upp_name ?? "",
    upp_code: record.upp_code,
    upp_status: record.upp_status ?? "active",
    sanitary,
    canExport: false, // will be computed below
  };

  bovino.canExport = checkExportability(bovino);
  return bovino;
}

import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";

export function toApiBovino(bovino: Bovino) {
  return {
    id: bovino.id,
    upp_id: bovino.upp_id,
    upp_name: bovino.upp_name,
    upp_code: bovino.upp_code,
    upp_status: bovino.upp_status,
    siniiga_tag: bovino.siniiga_tag,
    sex: bovino.sex,
    birth_date: bovino.birth_date,
    status: bovino.status,
    mother_animal_id: bovino.mother_animal_id,
    sanitary: {
      tb_date: bovino.sanitary.tb_date,
      tb_result: bovino.sanitary.tb_result,
      tb_valid_until: bovino.sanitary.tb_valid_until,
      tb_status: bovino.sanitary.tb_status,
      br_date: bovino.sanitary.br_date,
      br_result: bovino.sanitary.br_result,
      br_valid_until: bovino.sanitary.br_valid_until,
      br_status: bovino.sanitary.br_status,
      alert: bovino.sanitary.sanitary_alert,
    },
  };
}

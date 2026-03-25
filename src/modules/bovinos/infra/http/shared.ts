import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";

export function toApiBovino(bovino: Bovino) {
  return {
    id: bovino.id,
    upp_id: bovino.upp_id,
    upp_name: bovino.upp_name,
    upp_code: bovino.upp_code,
    upp_status: bovino.upp_status,
    siniiga_tag: bovino.siniiga_tag,
    name: bovino.name,
    sex: bovino.sex,
    birth_date: bovino.birth_date,
    breed: bovino.breed,
    weight_kg: bovino.weight_kg,
    age_years: bovino.age_years,
    health_status: bovino.health_status,
    last_vaccine_at: bovino.last_vaccine_at,
    status: bovino.status,
    mother_animal_id: bovino.mother_animal_id,
    current_collar_uuid: bovino.current_collar_uuid,
    current_collar_id: bovino.current_collar_id,
    current_collar_status: bovino.current_collar_status,
    current_collar_linked_at: bovino.current_collar_linked_at,
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

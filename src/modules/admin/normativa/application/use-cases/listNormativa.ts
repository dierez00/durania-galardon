import type { NormativaSetting } from "../../domain/entities/NormativaSettingEntity";
import type { NormativaRepository } from "../../domain/repositories/normativaRepository";

export function listNormativa(repository: NormativaRepository): NormativaSetting[] {
  return repository.list();
}

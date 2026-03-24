import type { NormativaSetting } from "../entities/NormativaSettingEntity";

export interface NormativaRepository {
  list(): NormativaSetting[];
}

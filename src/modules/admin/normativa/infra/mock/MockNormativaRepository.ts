import type { NormativaRepository } from "../../domain/repositories/normativaRepository";
import type { NormativaSetting } from "../../domain/entities/NormativaSettingEntity";
import { normativaMock } from "./normativa.mock";

export class MockNormativaRepository implements NormativaRepository {
  list(): NormativaSetting[] {
    return normativaMock;
  }
}

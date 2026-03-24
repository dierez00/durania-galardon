import type { PruebaSanitaria } from "../entities/PruebasEntity";

export interface PruebasRepository {
  list(): PruebaSanitaria[];
}


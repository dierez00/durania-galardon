import type { Productor } from "../entities/ProductoresEntity";

export interface ProductoresRepository {
  list(): Productor[];
}


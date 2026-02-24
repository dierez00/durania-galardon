import type { Bovino } from "../entities/Bovino";

export interface BovinoRepository {
  list(): Bovino[];
}

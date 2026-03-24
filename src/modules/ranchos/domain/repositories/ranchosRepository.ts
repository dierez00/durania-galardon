import type { Rancho } from "../entities/RanchosEntity";

export interface RanchosRepository {
  list(): Rancho[];
}


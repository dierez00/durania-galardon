import type { Bovino } from "../../domain/entities/Bovino";

export type BovinoRecord = Bovino;

export function toDomainBovino(record: BovinoRecord): Bovino {
  return record;
}

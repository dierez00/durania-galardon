import type { Cuarentena } from "../entities/CuarentenasEntity";

export interface CuarentenasRepository {
  list(): Cuarentena[];
}


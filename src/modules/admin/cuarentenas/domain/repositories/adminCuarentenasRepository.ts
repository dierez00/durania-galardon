import type { AdminCuarentena } from "../entities/AdminCuarentenaEntity";

export interface AdminCuarentenasRepository {
  list(): AdminCuarentena[];
}

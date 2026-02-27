import type { AdminCuarentenasRepository } from "../../domain/repositories/adminCuarentenasRepository";
import type { AdminCuarentena } from "../../domain/entities/AdminCuarentenaEntity";
import { adminCuarentenasMock } from "./adminCuarentenas.mock";

export class MockAdminCuarentenasRepository implements AdminCuarentenasRepository {
  list(): AdminCuarentena[] {
    return adminCuarentenasMock;
  }
}

import type { Cuarentena } from "../../domain/entities/CuarentenasEntity";
import type { CuarentenasRepository } from "../../domain/repositories/cuarentenasRepository";
import { cuarentenasMock } from "./cuarentenas.mock";

export class MockCuarentenasRepository implements CuarentenasRepository {
  constructor(private readonly items: Cuarentena[] = cuarentenasMock) {}

  list(): Cuarentena[] {
    return [...this.items];
  }
}

export const mockCuarentenasRepository = new MockCuarentenasRepository();
export { cuarentenasMock } from "./cuarentenas.mock";


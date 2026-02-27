import type { AdminMvzRepository } from "../../domain/repositories/adminMvzRepository";
import type { AdminMvz } from "../../domain/entities/AdminMvzEntity";
import { adminMvzMock } from "./adminMvz.mock";

export class MockAdminMvzRepository implements AdminMvzRepository {
  list(): AdminMvz[] {
    return adminMvzMock;
  }
}

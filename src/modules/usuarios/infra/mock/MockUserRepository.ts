import type { User } from "../../domain/entities/User";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import { users } from "./users.mock";

export class MockUserRepository implements UserRepository {
  constructor(private readonly items: User[] = users) {}

  list(): User[] {
    return [...this.items];
  }
}

export const mockUserRepository = new MockUserRepository();

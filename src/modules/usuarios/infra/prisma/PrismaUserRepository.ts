import type { User } from "../../domain/entities/User";
import type { UserRepository } from "../../domain/repositories/UserRepository";

export class PrismaUserRepository implements UserRepository {
  list(): User[] {
    throw new Error("PrismaUserRepository.list is not implemented in this phase.");
  }
}

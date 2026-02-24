import type { User } from "../../domain/entities/User";
import type { UserRepository } from "../../domain/repositories/UserRepository";

export function listUsers(repository: UserRepository): User[] {
  return repository.list();
}

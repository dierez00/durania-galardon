import type { User } from "../entities/User";

export interface UserRepository {
  list(): User[];
}

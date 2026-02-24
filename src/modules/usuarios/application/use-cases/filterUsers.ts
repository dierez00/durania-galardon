import type { User, UsersFiltersState } from "../../domain/entities/User";
import { filterUsers } from "../../domain/services/filterUsers";

export function filterUsersUseCase(users: User[], filters: UsersFiltersState): User[] {
  return filterUsers(users, filters);
}

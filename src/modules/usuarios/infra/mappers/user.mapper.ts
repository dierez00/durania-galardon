import type { User } from "../../domain/entities/User";

export type UserRecord = User;

export function toDomainUser(record: UserRecord): User {
  return record;
}

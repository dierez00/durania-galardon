import type { AdminMvz } from "../entities/AdminMvzEntity";

export interface AdminMvzRepository {
  list(): AdminMvz[];
}

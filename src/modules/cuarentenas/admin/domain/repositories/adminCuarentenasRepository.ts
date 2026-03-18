import type {
  AdminCuarentena,
  AdminCuarentenasSortDir,
  AdminCuarentenasSortField,
} from "../entities/AdminCuarentenaEntity";
import type {
  AdminCuarentenaMapPoint,
  AdminCuarentenaActivationContextItem,
} from "../entities/AdminCuarentenaDetailEntity";

export interface ListAdminCuarentenasParams {
  search?: string;
  status?: string;
  quarantineType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: AdminCuarentenasSortField;
  sortDir?: AdminCuarentenasSortDir;
}

export interface ListAdminCuarentenasResult {
  quarantines: AdminCuarentena[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminCuarentenaCreateInput {
  title: string;
  uppId?: string;
  quarantineType: "state" | "operational";
  reason?: string;
  epidemiologicalNote?: string;
  geojson?: Record<string, unknown>;
}

export interface AdminCuarentenasRepository {
  list(params: ListAdminCuarentenasParams): Promise<ListAdminCuarentenasResult>;
  create(input: AdminCuarentenaCreateInput): Promise<AdminCuarentena>;
  getMapPoints(): Promise<AdminCuarentenaMapPoint[]>;
  getActivationContext(): Promise<AdminCuarentenaActivationContextItem[]>;
}


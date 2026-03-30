import type { ICollarRepository } from "@/modules/collars/domain/repositories/CollarRepository";
import type { Collar } from "@/modules/collars/domain/entities/Collar";

export interface CollarFilters {
  status?: string;
  search?: string;
  firmware?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetAllCollarsResult {
  collars: Collar[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Use Case: Get ALL collars (assigned and unassigned) for tenant with pagination and filters
 */
export class GetAllCollarsByTenant {
  constructor(private readonly repository: ICollarRepository) {}

  async execute(
    limit: number = 50,
    offset: number = 0,
    filters?: CollarFilters
  ): Promise<GetAllCollarsResult> {
    // Get all collars for tenant (both assigned and unassigned) with optional filters
    const result = await this.repository.findByTenant(limit, offset, filters);
    return result;
  }
}

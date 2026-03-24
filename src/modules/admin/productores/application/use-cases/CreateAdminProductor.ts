import type {
  AdminProductorCreateResult,
  AdminProductoresRepository,
  AdminProductorCreateInput,
} from "../../domain/repositories/adminProductoresRepository";

/**
 * Caso de uso: dar de alta un productor.
 * No conoce fetch, HTTP ni access tokens — solo el puerto de domain.
 */
export class CreateAdminProductor {
  constructor(private readonly repository: AdminProductoresRepository) {}

  async execute(input: AdminProductorCreateInput): Promise<AdminProductorCreateResult> {
    return this.repository.create(input);
  }
}

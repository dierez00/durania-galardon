import type {
  AdminProductoresRepository,
  ListAdminProductoresParams,
  ListAdminProductoresResult,
} from "../../domain/repositories/adminProductoresRepository";

/**
 * Caso de uso: listar productores con filtros, paginación y ordenamiento.
 * No conoce fetch, HTTP ni access tokens — solo el puerto de domain.
 */
export class ListAdminProductores {
  constructor(private readonly repository: AdminProductoresRepository) {}

  async execute(params: ListAdminProductoresParams): Promise<ListAdminProductoresResult> {
    return this.repository.list(params);
  }
}

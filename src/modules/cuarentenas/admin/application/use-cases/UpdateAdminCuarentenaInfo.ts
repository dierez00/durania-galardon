import type { IAdminCuarentenaDetailRepository } from "../../domain/repositories/IAdminCuarentenaDetailRepository";
import { UpdateAdminCuarentenaInfoValidationError } from "../dto/UpdateAdminCuarentenaInfoDTO";

export class UpdateAdminCuarentenaInfoUseCase {
  constructor(private readonly repo: IAdminCuarentenaDetailRepository) {}

  async execute(
    id: string,
    payload: { epidemiologicalNote?: string; geojson?: Record<string, unknown> | null }
  ): Promise<void> {
    if (
      payload.epidemiologicalNote?.trim().length === 0
    ) {
      throw new UpdateAdminCuarentenaInfoValidationError(
        "epidemiologicalNote",
        "La nota epidemiológica no puede estar vacía."
      );
    }
    return this.repo.updateInfo(id, payload);
  }
}

export interface UpdateAdminCuarentenaInfoDTO {
  epidemiologicalNote?: string;
  geojson?: Record<string, unknown> | null;
}

export class UpdateAdminCuarentenaInfoValidationError extends Error {
  constructor(
    public readonly field: keyof UpdateAdminCuarentenaInfoDTO,
    message: string
  ) {
    super(message);
    this.name = "UpdateAdminCuarentenaInfoValidationError";
  }
}

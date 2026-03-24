// ── Validation constants ───────────────────────────────────────────────────────
export const CURP_MAX_LENGTH = 18;
export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── DTO ───────────────────────────────────────────────────────────────────────
/**
 * Payload for the UpdateAdminProductorInfo use-case.
 * All fields are optional — only the ones provided will be persisted.
 * `curp: null` explicitly clears the value.
 */
export interface UpdateAdminProductorInfoDTO {
  fullName?: string;
  curp?: string | null;
  email?: string;
}

// ── Domain validation error ────────────────────────────────────────────────────
/**
 * Thrown by the use-case when a field fails business validation.
 * The presentation layer can catch this to show per-field error messages
 * without treating it as a generic network failure.
 */
export class UpdateAdminProductorInfoValidationError extends Error {
  constructor(
    public readonly field: keyof UpdateAdminProductorInfoDTO,
    message: string
  ) {
    super(message);
    this.name = "UpdateAdminProductorInfoValidationError";
  }
}

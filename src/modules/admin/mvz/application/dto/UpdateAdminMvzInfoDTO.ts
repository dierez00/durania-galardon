// ── Validation constants ───────────────────────────────────────────────────────
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── DTO ───────────────────────────────────────────────────────────────────────
/**
 * Payload for the UpdateAdminMvzInfo use-case.
 * All fields are optional — only the ones provided will be persisted.
 */
export interface UpdateAdminMvzInfoDTO {
  fullName?: string;
  licenseNumber?: string;
  email?: string;
}

// ── Domain validation error ────────────────────────────────────────────────────
/**
 * Thrown by the use-case when a field fails business validation.
 * The presentation layer can catch this to show per-field error messages
 * without treating it as a generic network failure.
 */
export class UpdateAdminMvzInfoValidationError extends Error {
  constructor(
    public readonly field: keyof UpdateAdminMvzInfoDTO,
    message: string
  ) {
    super(message);
    this.name = "UpdateAdminMvzInfoValidationError";
  }
}

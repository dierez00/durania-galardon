import type { IAdminMvzDetailRepository } from "@/modules/admin/mvz/domain/repositories/IAdminMvzDetailRepository";
import {
  EMAIL_REGEX,
  UpdateAdminMvzInfoValidationError,
} from "@/modules/admin/mvz/application/dto/UpdateAdminMvzInfoDTO";
import type { UpdateAdminMvzInfoDTO } from "@/modules/admin/mvz/application/dto/UpdateAdminMvzInfoDTO";

export class UpdateAdminMvzInfoUseCase {
  constructor(private readonly repo: IAdminMvzDetailRepository) {}

  async execute(id: string, dto: UpdateAdminMvzInfoDTO): Promise<void> {
    // ── Validate & normalise each field present in the payload ────────────────
    let { fullName, licenseNumber, email } = dto;

    if (fullName !== undefined) {
      fullName = fullName.trim();
      if (!fullName) {
        throw new UpdateAdminMvzInfoValidationError(
          "fullName",
          "El nombre no puede estar vacío."
        );
      }
    }

    if (licenseNumber !== undefined) {
      licenseNumber = licenseNumber.trim().toUpperCase();
      if (!licenseNumber) {
        throw new UpdateAdminMvzInfoValidationError(
          "licenseNumber",
          "La cédula profesional no puede estar vacía."
        );
      }
    }

    if (email !== undefined) {
      email = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) {
        throw new UpdateAdminMvzInfoValidationError(
          "email",
          "El correo electrónico no es válido."
        );
      }
    }

    // ── Dispatch to the correct port ──────────────────────────────────────────
    // DB fields (mvz_profiles table) and auth fields (GoTrue) are kept separate
    // so a failure in one does not silently corrupt the other.
    if (fullName !== undefined || licenseNumber !== undefined) {
      await this.repo.updateProfile(id, { fullName, licenseNumber });
    }

    if (email !== undefined) {
      await this.repo.updateEmail(id, email);
    }
  }
}

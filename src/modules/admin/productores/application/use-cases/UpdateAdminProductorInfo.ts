import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import {
  CURP_MAX_LENGTH,
  CURP_REGEX,
  EMAIL_REGEX,
  UpdateAdminProductorInfoValidationError,
} from "@/modules/admin/productores/application/dto/UpdateAdminProductorInfoDTO";
import type { UpdateAdminProductorInfoDTO } from "@/modules/admin/productores/application/dto/UpdateAdminProductorInfoDTO";

export class UpdateAdminProductorInfoUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(id: string, dto: UpdateAdminProductorInfoDTO): Promise<void> {
    // ── Validate & normalise each field present in the payload ────────────────
    let { fullName, curp, email } = dto;

    if (fullName !== undefined) {
      fullName = fullName.trim();
      if (!fullName) {
        throw new UpdateAdminProductorInfoValidationError(
          "fullName",
          "El nombre no puede estar vacío."
        );
      }
    }

    if (curp !== undefined && curp !== null) {
      curp = curp.trim().toUpperCase();
      if (curp.length > CURP_MAX_LENGTH) {
        throw new UpdateAdminProductorInfoValidationError(
          "curp",
          `La CURP no puede exceder ${CURP_MAX_LENGTH} caracteres.`
        );
      }
      if (!CURP_REGEX.test(curp)) {
        throw new UpdateAdminProductorInfoValidationError(
          "curp",
          "La CURP no tiene un formato válido (ej. AAAA000000HAAAAAA0)."
        );
      }
    }

    if (email !== undefined) {
      email = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) {
        throw new UpdateAdminProductorInfoValidationError(
          "email",
          "El correo electrónico no es válido."
        );
      }
    }

    // ── Dispatch to the correct port ──────────────────────────────────────────
    // DB fields (producers table) and auth fields (GoTrue) are kept separate
    // so a failure in one does not silently corrupt the other.
    if (fullName !== undefined || curp !== undefined) {
      await this.repo.updateProfile(id, { fullName, curp });
    }

    if (email !== undefined) {
      await this.repo.updateEmail(id, email);
    }
  }
}

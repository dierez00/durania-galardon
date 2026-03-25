import type {
  AdminDocumentStatus,
  ReviewAdminProductorDocumentInput,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

const EXPIRED_COMMENT = "Documento no vigente, favor actualizar";

export class AdminDocumentReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminDocumentReviewValidationError";
  }
}

export interface ResolvedAdminDocumentReview {
  status: AdminDocumentStatus;
  comments: string | null;
  expiryDate: string | null;
}

function normalizeDateToStartOfDay(dateValue: Date): Date {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
}

function parseExpiryDate(expiryDate: string | null | undefined): Date | null {
  if (!expiryDate) return null;
  const parsed = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AdminDocumentReviewValidationError("La fecha de vigencia no es valida.");
  }
  return parsed;
}

export function resolveAdminDocumentReview(input: ReviewAdminProductorDocumentInput): ResolvedAdminDocumentReview {
  const normalizedComments = input.comments?.trim() ?? "";
  const parsedExpiryDate = parseExpiryDate(input.expiryDate);
  const today = normalizeDateToStartOfDay(new Date());

  if (input.status === "rejected" && normalizedComments.length === 0) {
    throw new AdminDocumentReviewValidationError("Debes agregar un comentario al rechazar un documento.");
  }

  if (parsedExpiryDate && parsedExpiryDate < today) {
    return {
      status: "expired",
      comments: EXPIRED_COMMENT,
      expiryDate: input.expiryDate ?? null,
    };
  }

  if (input.status === "expired") {
    return {
      status: "expired",
      comments: EXPIRED_COMMENT,
      expiryDate: input.expiryDate ?? null,
    };
  }

  if (input.status === "rejected") {
    return {
      status: "rejected",
      comments: normalizedComments,
      expiryDate: input.expiryDate ?? null,
    };
  }

  return {
    status: input.status,
    comments: null,
    expiryDate: input.expiryDate ?? null,
  };
}

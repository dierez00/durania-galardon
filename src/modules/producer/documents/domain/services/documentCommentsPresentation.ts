import type { DocumentStatus } from "@/modules/producer/documents/domain/entities/ProducerDocumentEntity";

interface ResolveDocumentCommentInput {
  status: DocumentStatus;
  isCurrent: boolean;
  comments: string | null;
  documentTypeKey: string;
}

const NON_CURRENT_MESSAGE = "Documento no vigente, favor de actualizar";

export function resolveProducerDocumentComment(input: ResolveDocumentCommentInput): string | null {
  const normalizedComment = input.comments?.trim() ?? "";

  if (input.status === "rejected" && normalizedComment.length > 0) {
    return normalizedComment;
  }

  if (input.status === "expired" || !input.isCurrent) {
    return NON_CURRENT_MESSAGE;
  }

  if (input.documentTypeKey === "comprobante_domicilio" && normalizedComment.length > 0) {
    return normalizedComment;
  }

  return null;
}

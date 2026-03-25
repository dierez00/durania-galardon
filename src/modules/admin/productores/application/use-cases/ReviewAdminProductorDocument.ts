import type {
  ReviewAdminProductorDocumentInput,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";
import {
  resolveAdminDocumentReview,
} from "@/modules/admin/productores/domain/services/adminDocumentReviewPolicy";

export class ReviewAdminProductorDocumentUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(producerId: string, input: ReviewAdminProductorDocumentInput): Promise<void> {
    const resolved = resolveAdminDocumentReview(input);
    await this.repo.reviewDocument(producerId, {
      ...input,
      status: resolved.status,
      comments: resolved.comments,
      expiryDate: resolved.expiryDate,
    });
  }
}

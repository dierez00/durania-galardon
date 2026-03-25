import type { AdminDocumentSourceType } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";

export class GetAdminProductorDocumentSignedUrlUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(
    producerId: string,
    sourceType: AdminDocumentSourceType,
    documentId: string
  ): Promise<string | null> {
    return this.repo.getDocumentSignedUrl(producerId, sourceType, documentId);
  }
}

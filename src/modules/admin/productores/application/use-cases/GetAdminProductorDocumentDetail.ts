import type {
  AdminDocumentSourceType,
  AdminProductorDocumentDetail,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import type { IAdminProductorDetailRepository } from "@/modules/admin/productores/domain/repositories/IAdminProductorDetailRepository";

export class GetAdminProductorDocumentDetailUseCase {
  constructor(private readonly repo: IAdminProductorDetailRepository) {}

  async execute(
    producerId: string,
    sourceType: AdminDocumentSourceType,
    documentId: string
  ): Promise<AdminProductorDocumentDetail | null> {
    return this.repo.getDocumentDetail(producerId, sourceType, documentId);
  }
}

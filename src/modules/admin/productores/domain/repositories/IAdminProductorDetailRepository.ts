import type {
  AdminDocumentSourceType,
  AdminProductorDetallado,
  AdminProductorDocument,
  AdminProductorDocumentDetail,
  AdminProductorUpp,
  AdminProductorVisitsPaginated,
  ReviewAdminProductorDocumentInput,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

export interface IAdminProductorDetailRepository {
  getById(id: string): Promise<AdminProductorDetallado | null>;
  getUpps(id: string): Promise<AdminProductorUpp[]>;
  getDocuments(id: string): Promise<AdminProductorDocument[]>;
  getDocumentDetail(
    producerId: string,
    sourceType: AdminDocumentSourceType,
    documentId: string
  ): Promise<AdminProductorDocumentDetail | null>;
  getDocumentSignedUrl(
    producerId: string,
    sourceType: AdminDocumentSourceType,
    documentId: string
  ): Promise<string | null>;
  reviewDocument(producerId: string, input: ReviewAdminProductorDocumentInput): Promise<void>;
  getVisits(id: string, page: number): Promise<AdminProductorVisitsPaginated>;
  updateStatus(id: string, status: "active" | "inactive"): Promise<void>;
  /**
   * Updates profile fields stored in the DB (producers table).
   * Separate from updateEmail because email lives in GoTrue (auth layer).
   */
  updateProfile(id: string, payload: { fullName?: string; curp?: string | null }): Promise<void>;
  /**
   * Updates the user's auth email via the GoTrue admin API.
   * Kept separate because a GoTrue failure must not silently corrupt DB state.
   */
  updateEmail(id: string, email: string): Promise<void>;
  deleteProductor(id: string): Promise<void>;
}

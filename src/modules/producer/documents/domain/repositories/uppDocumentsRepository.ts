import type { UppDocument } from "../entities/UppDocumentEntity";

export interface IUppDocumentsRepository {
  list(uppId?: string): Promise<UppDocument[]>;
  upload(file: File, uppId: string, documentType: string, expiryDate?: string): Promise<UppDocument>;
  updateStatus(documentId: string, status: string, comments?: string | null): Promise<void>;
  delete(documentId: string): Promise<void>;
}

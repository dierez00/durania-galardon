import type { UppDocument } from "../entities/UppDocumentEntity";

export interface IUppDocumentsRepository {
  list(): Promise<UppDocument[]>;
  upload(file: File, uppId: string, documentType: string, expiryDate?: string): Promise<UppDocument>;
  updateStatus(documentId: string, status: string): Promise<void>;
}

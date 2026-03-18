import type { ProducerDocument } from "../entities/ProducerDocumentEntity";

export interface IProducerDocumentsRepository {
  list(): Promise<ProducerDocument[]>;
  upload(file: File, documentTypeKey: string, expiryDate?: string): Promise<ProducerDocument>;
  updateStatus(documentId: string, status: string): Promise<void>;
  delete(documentId: string): Promise<void>;
}

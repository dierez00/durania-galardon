import type { IProducerDocumentsRepository } from "../../domain/repositories/producerDocumentsRepository";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import { resolveExpiryDate } from "../../domain/services/documentExpiryCalculator";

export class UploadProducerDocument {
  constructor(private readonly repository: IProducerDocumentsRepository) {}

  execute(file: File, documentTypeKey: string, inputDate?: string): Promise<ProducerDocument> {
    const expiryDate = inputDate ? resolveExpiryDate(documentTypeKey, inputDate) : undefined;
    return this.repository.upload(file, documentTypeKey, expiryDate);
  }
}

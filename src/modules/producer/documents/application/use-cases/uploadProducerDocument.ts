import type { IProducerDocumentsRepository } from "../../domain/repositories/producerDocumentsRepository";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";

export class UploadProducerDocument {
  constructor(private readonly repository: IProducerDocumentsRepository) {}

  execute(file: File, documentTypeKey: string, expiryDate?: string): Promise<ProducerDocument> {
    return this.repository.upload(file, documentTypeKey, expiryDate);
  }
}

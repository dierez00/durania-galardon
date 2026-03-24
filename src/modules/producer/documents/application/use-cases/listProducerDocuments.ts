import type { IProducerDocumentsRepository } from "../../domain/repositories/producerDocumentsRepository";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";

export class ListProducerDocuments {
  constructor(private readonly repository: IProducerDocumentsRepository) {}

  execute(): Promise<ProducerDocument[]> {
    return this.repository.list();
  }
}

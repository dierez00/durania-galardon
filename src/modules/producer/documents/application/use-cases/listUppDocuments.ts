import type { IUppDocumentsRepository } from "../../domain/repositories/uppDocumentsRepository";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";

export class ListUppDocuments {
  constructor(private readonly repository: IUppDocumentsRepository) {}

  execute(): Promise<UppDocument[]> {
    return this.repository.list();
  }
}

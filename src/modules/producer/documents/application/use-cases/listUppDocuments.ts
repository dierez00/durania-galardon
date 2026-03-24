import type { IUppDocumentsRepository } from "../../domain/repositories/uppDocumentsRepository";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";

export class ListUppDocuments {
  constructor(private readonly repository: IUppDocumentsRepository) {}

  execute(uppId?: string): Promise<UppDocument[]> {
    return this.repository.list(uppId);
  }
}

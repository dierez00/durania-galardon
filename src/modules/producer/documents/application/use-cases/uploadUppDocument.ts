import type { IUppDocumentsRepository } from "../../domain/repositories/uppDocumentsRepository";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";

export class UploadUppDocument {
  constructor(private readonly repository: IUppDocumentsRepository) {}

  execute(file: File, uppId: string, documentType: string, expiryDate?: string, bovinoId?: string): Promise<UppDocument> {
    return this.repository.upload(file, uppId, documentType, expiryDate, bovinoId);
  }
}

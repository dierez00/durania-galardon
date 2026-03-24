import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";
import type { DocumentProgress } from "../../domain/entities/DocumentProgressEntity";
import { calculateDocumentProgress } from "../../domain/services/documentProgressService";

export class CalculateDocumentProgress {
  execute(
    producerDocs: ProducerDocument[],
    uppDocs: UppDocument[],
    upps: Array<{ id: string; name: string }>,
    currentUppId?: string
  ): DocumentProgress {
    return calculateDocumentProgress(producerDocs, uppDocs, upps, currentUppId);
  }
}

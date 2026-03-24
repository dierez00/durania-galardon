import { ProducerDocumentsApiRepository } from "./api/producerDocumentsApi";
import { UppDocumentsApiRepository } from "./api/uppDocumentsApi";
import { ListProducerDocuments } from "../application/use-cases/listProducerDocuments";
import { UploadProducerDocument } from "../application/use-cases/uploadProducerDocument";
import { DeleteProducerDocumentUseCase } from "../application/use-cases/deleteProducerDocument";
import { ListUppDocuments } from "../application/use-cases/listUppDocuments";
import { UploadUppDocument } from "../application/use-cases/uploadUppDocument";
import { DeleteUppDocumentUseCase } from "../application/use-cases/deleteUppDocument";
import { CalculateDocumentProgress } from "../application/use-cases/calculateDocumentProgress";

// Repositories
const producerDocsRepository = new ProducerDocumentsApiRepository();
const uppDocsRepository = new UppDocumentsApiRepository();

// Use Cases
export const listProducerDocumentsUseCase = new ListProducerDocuments(producerDocsRepository);
export const uploadProducerDocumentUseCase = new UploadProducerDocument(producerDocsRepository);
export const deleteProducerDocumentUseCase = new DeleteProducerDocumentUseCase(producerDocsRepository);
export const listUppDocumentsUseCase = new ListUppDocuments(uppDocsRepository);
export const uploadUppDocumentUseCase = new UploadUppDocument(uppDocsRepository);
export const deleteUppDocumentUseCase = new DeleteUppDocumentUseCase(uppDocsRepository);
export const calculateDocumentProgressUseCase = new CalculateDocumentProgress();

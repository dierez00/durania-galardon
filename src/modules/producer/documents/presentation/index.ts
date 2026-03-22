/**
 * Presentation Layer - Document Management
 *
 * Expone componentes y hooks para la gestión visual de documentos
 */

// Pages
export { default as ProducerDocumentosPage } from "./ProducerDocumentosPage";

// Layouts

// Components
export { DocumentList } from "./components/DocumentList";
export { DocumentProgressIndicator } from "./components/DocumentProgressIndicator";
export { DocumentStatusNotification } from "./components/DocumentStatusNotification";
export { DocumentUploadCard } from "./components/DocumentUploadCard";

// Hooks
export { useDocumentDelete } from "./hooks/useDocumentDelete";
export { useDocumentPolling } from "./hooks/useDocumentPolling";
export { useDocumentProgress } from "./hooks/useDocumentProgress";
export { useDocumentUpload } from "./hooks/useDocumentUpload";
export { useProducerDocuments } from "./hooks/useProducerDocuments";
export { useUppDocuments } from "./hooks/useUppDocuments";


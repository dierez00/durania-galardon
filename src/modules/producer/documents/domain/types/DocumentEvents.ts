import { DocumentStatus } from "@/modules/producer/documents/domain/entities/ProducerDocumentEntity";

export interface DocumentStatusChangeEvent {
  documentId: string;
  documentType: string;
  documentLevel: 'personal' | 'upp';
  previousStatus: DocumentStatus;
  newStatus: DocumentStatus;
}

export interface DocumentExpiringEvent {
  documentId: string;
  documentType: string;
  documentLevel: 'personal' | 'upp';
  daysUntilExpiry: number;
  expiryDate: string;
}

export interface DocumentUploadedEvent {
  documentId: string;
  documentType: string;
  documentLevel: 'personal' | 'upp';
  uploadedAt: string;
}

export type DocumentChangeEvent =
  | { type: 'status-changed'; data: DocumentStatusChangeEvent }
  | { type: 'expiring-soon'; data: DocumentExpiringEvent }
  | { type: 'newly-uploaded'; data: DocumentUploadedEvent }
  | { type: 'expired'; data: DocumentExpiringEvent };

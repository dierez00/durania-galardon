export interface AdminProductorDetallado {
  id: string;
  fullName: string;
  curp: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  totalUpps: number;
  totalBovinos: number;
  totalDocuments: number;
  totalVisits: number;
}

export interface AdminProductorUppMvz {
  mvzProfileId: string;
  fullName: string;
  licenseNumber: string;
  mvzStatus: string;
  status: string;
  assignedAt: string;
}

export interface AdminProductorUpp {
  id: string;
  uppCode: string | null;
  name: string;
  addressText: string | null;
  locationLat: number | null;
  locationLng: number | null;
  hectaresTotal: number | null;
  herdLimit: number | null;
  status: string;
  createdAt: string;
  animalCount: number;
  mvzAssignments: AdminProductorUppMvz[];
}

export interface AdminProductorDocument {
  id: string;
  sourceType: AdminDocumentSourceType;
  sourceId: string;
  uppId: string | null;
  uppName: string | null;
  documentType: string;
  fileStorageKey: string;
  status: AdminDocumentStatus;
  comments: string | null;
  isCurrent: boolean;
  issuedAt: string | null;
  expiryDate: string | null;
  uploadedAt: string;
}

export type AdminDocumentSourceType = "producer" | "upp";

export type AdminDocumentStatus = "pending" | "validated" | "expired" | "rejected";

export interface AdminProductorDocumentDetail extends AdminProductorDocument {
  extractedFields: Record<string, unknown> | null;
  ocrFields: Record<string, unknown> | null;
  ocrMetadata: Record<string, unknown> | null;
  ocrConfidence: number | null;
}

export interface ReviewAdminProductorDocumentInput {
  documentId: string;
  sourceType: AdminDocumentSourceType;
  status: AdminDocumentStatus;
  comments?: string | null;
  expiryDate?: string | null;
}

export interface AdminProductorVisit {
  id: string;
  uppId: string;
  uppName: string;
  mvzFullName: string;
  mvzLicense: string;
  visitType: string;
  status: string;
  scheduledAt: string;
  finishedAt: string | null;
}

export interface AdminProductorVisitsPaginated {
  visits: AdminProductorVisit[];
  total: number;
  page: number;
  limit: number;
}

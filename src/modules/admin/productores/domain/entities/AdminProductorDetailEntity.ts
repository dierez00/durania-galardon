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
  documentType: string;
  status: string;
  comments: string | null;
  isCurrent: boolean;
  expiryDate: string | null;
  uploadedAt: string;
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

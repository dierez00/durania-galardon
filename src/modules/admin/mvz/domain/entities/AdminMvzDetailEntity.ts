export interface AdminMvzDetallado {
  id: string;
  fullName: string;
  licenseNumber: string;
  email: string | null;
  status: string;
  createdAt: string;
  totalUpps: number;
  activeAssignments: number;
  totalTests: number;
  totalVisits: number;
}

export interface AdminMvzUpp {
  id: string;
  uppCode: string | null;
  name: string;
  addressText: string | null;
  status: string;
  animalCount: number;
  producerName: string;
}

export interface AdminMvzTest {
  id: string;
  animalTag: string;
  testTypeName: string;
  sampleDate: string;
  result: string;
  createdAt: string;
}

export interface AdminMvzVisit {
  id: string;
  uppId: string;
  uppName: string;
  visitType: string;
  status: string;
  scheduledAt: string;
  finishedAt: string | null;
}

export interface AdminMvzVisitsPaginated {
  visits: AdminMvzVisit[];
  total: number;
  page: number;
  limit: number;
}

/** UPP disponible para asignar al MVZ (sin asignación activa en el sistema) */
export interface AdminMvzAvailableUpp {
  id: string;
  uppCode: string | null;
  name: string;
  addressText: string | null;
  animalCount: number;
  producerName: string;
}

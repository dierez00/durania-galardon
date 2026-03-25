export type SanitaryAlert =
  | "ok"
  | "por_vencer"
  | "prueba_vencida"
  | "sin_pruebas"
  | "positivo"
  | "inactivo";

export interface AdminExportacionAnimal {
  id: string;
  siniigaTag: string;
  name: string | null;
  sex: "M" | "F";
  birthDate: string | null;
  breed: string | null;
  weightKg: number | null;
  ageYears: number | null;
  healthStatus: string | null;
  lastVaccineAt: string | null;
  status: string;
  currentCollarId: string | null;
  currentCollarStatus: string | null;
  currentCollarLinkedAt: string | null;
  sanitaryAlert: SanitaryAlert;
  // TB
  tbLastDate: string | null;
  tbResult: string | null;
  tbValidUntil: string | null;
  tbStatus: string | null;
  // BR
  brLastDate: string | null;
  brResult: string | null;
  brValidUntil: string | null;
  brStatus: string | null;
}

export interface AdminExportacionAnimalTest {
  id: string;
  testTypeKey: "tb" | "br";
  sampleDate: string;
  result: string;
  validUntil: string | null;
  mvzFullName: string | null;
}

export interface AdminExportacionAnimalVaccination {
  id: string;
  vaccineName: string;
  dose: string | null;
  status: string;
  appliedAt: string | null;
  dueAt: string | null;
  mvzFullName: string | null;
  notes: string | null;
}

export interface AdminExportacionAnimalIncident {
  id: string;
  incidentType: string;
  severity: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
  mvzFullName: string | null;
  description: string | null;
}

export interface AdminExportacionAnimalDetail extends AdminExportacionAnimal {
  uppId: string;
  uppName: string | null;
  uppCode: string | null;
  motherAnimalId: string | null;
  tests: AdminExportacionAnimalTest[];
  vaccinations: AdminExportacionAnimalVaccination[];
  incidents: AdminExportacionAnimalIncident[];
}

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
  sex: "M" | "F";
  birthDate: string | null;
  status: string;
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

export interface AdminExportacionAnimalDetail extends AdminExportacionAnimal {
  uppId: string;
  uppName: string | null;
  motherAnimalId: string | null;
  tests: AdminExportacionAnimalTest[];
}

export interface UpdateAdminProductorDTO {
  id: string;
  status?: "active" | "inactive";
  fullName?: string;
  curp?: string | null;
}

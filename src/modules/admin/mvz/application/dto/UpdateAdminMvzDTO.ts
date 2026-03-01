export interface UpdateAdminMvzDTO {
  id: string;
  status?: "active" | "inactive";
  fullName?: string;
  licenseNumber?: string;
}

export interface CreateAdminCuarentenaDTO {
  title: string;
  uppId?: string;
  quarantineType: "state" | "operational";
  reason?: string;
  epidemiologicalNote?: string;
}

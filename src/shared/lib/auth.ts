export const APP_ROLES = ["admin", "mvz", "producer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  mvz: "MVZ",
  producer: "Productor",
};

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function redirectPathForRole(role: AppRole): string {
  if (role === "admin") {
    return "/admin/panel";
  }

  return "/dashboard";
}

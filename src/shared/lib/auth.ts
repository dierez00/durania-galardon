export const APP_ROLES = [
  "tenant_admin",
  "producer",
  "employee",
  "producer_viewer",
  "mvz_government",
  "mvz_internal",
] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type TenantPanelType = "government" | "producer" | "mvz";

export const ROLE_LABELS: Record<AppRole, string> = {
  tenant_admin: "Administrador",
  producer: "Productor",
  employee: "Empleado",
  producer_viewer: "Consulta",
  mvz_government: "MVZ Gobierno",
  mvz_internal: "MVZ Interno",
};

export const PERMISSION_KEYS = [
  "admin.dashboard.read",
  "admin.tenant.read",
  "admin.tenant.write",
  "admin.employees.read",
  "admin.employees.write",
  "admin.roles.read",
  "admin.roles.write",
  "admin.users.read",
  "admin.users.create",
  "admin.users.update",
  "admin.users.delete",
  "admin.users.roles",
  "admin.producers.read",
  "admin.producers.write",
  "admin.mvz.read",
  "admin.mvz.write",
  "admin.upps.read",
  "admin.upps.write",
  "admin.quarantines.read",
  "admin.quarantines.write",
  "admin.exports.read",
  "admin.exports.write",
  "admin.normative.read",
  "admin.normative.write",
  "admin.audit.read",
  "admin.reports.export",
  "admin.appointments.read",
  "admin.appointments.write",
  "admin.collars.read",
  "admin.collars.write",
  "mvz.dashboard.read",
  "mvz.assignments.read",
  "mvz.bovinos.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.quarantines.read",
  "mvz.quarantines.write",
  "mvz.exports.read",
  "mvz.exports.write",
  "mvz.notifications.read",
  "mvz.tenant.read",
  "mvz.tenant.write",
  "mvz.profile.read",
  "mvz.profile.write",
  "mvz.members.read",
  "mvz.members.write",
  "mvz.roles.read",
  "mvz.roles.write",
  "mvz.ranch.read",
  "mvz.ranch.animals.read",
  "mvz.ranch.clinical.read",
  "mvz.ranch.vaccinations.read",
  "mvz.ranch.vaccinations.write",
  "mvz.ranch.incidents.read",
  "mvz.ranch.incidents.write",
  "mvz.ranch.reports.read",
  "mvz.ranch.documents.read",
  "mvz.ranch.documents.write",
  "mvz.ranch.visits.read",
  "mvz.ranch.visits.write",
  "producer.dashboard.read",
  "producer.tenant.read",
  "producer.tenant.write",
  "producer.upp.read",
  "producer.upp.write",
  "producer.bovinos.read",
  "producer.bovinos.write",
  "producer.movements.read",
  "producer.movements.write",
  "producer.exports.read",
  "producer.exports.write",
  "producer.documents.read",
  "producer.documents.write",
  "producer.notifications.read",
  "producer.profile.read",
  "producer.profile.write",
  "producer.employees.read",
  "producer.employees.write",
  "producer.roles.read",
  "producer.roles.write",
  "producer.collars.read",
  "producer.collars.write",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ALL_PERMISSION_KEYS: PermissionKey[] = [...PERMISSION_KEYS];

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEYS.includes(value as PermissionKey);
}

export type AuditAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "status_change"
  | "export"
  | "sync"
  | "fraud_attempt";

export type ReportFormat = "excel" | "pdf";

export interface OfflineSyncItem {
  clientMutationId: string;
  uppId: string;
  animalId: string;
  testTypeKey: string;
  sampleDate: string;
  result: "negative" | "positive" | "inconclusive";
  validUntil?: string;
  capturedLat?: number;
  capturedLng?: number;
}

const ADMIN_PERMISSION_SET = PERMISSION_KEYS.filter((permission) =>
  permission.startsWith("admin.")
) as PermissionKey[];
const MVZ_GOVERNMENT_PERMISSION_SET: PermissionKey[] = [
  "mvz.dashboard.read",
  "mvz.assignments.read",
  "mvz.bovinos.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.quarantines.read",
  "mvz.quarantines.write",
  "mvz.exports.read",
  "mvz.exports.write",
  "mvz.notifications.read",
  "mvz.tenant.read",
  "mvz.tenant.write",
  "mvz.profile.read",
  "mvz.profile.write",
  "mvz.ranch.read",
  "mvz.ranch.animals.read",
  "mvz.ranch.clinical.read",
  "mvz.ranch.vaccinations.read",
  "mvz.ranch.vaccinations.write",
  "mvz.ranch.incidents.read",
  "mvz.ranch.incidents.write",
  "mvz.ranch.reports.read",
  "mvz.ranch.documents.read",
  "mvz.ranch.documents.write",
  "mvz.ranch.visits.read",
  "mvz.ranch.visits.write",
];
export const MVZ_TENANT_INTERNAL_PERMISSION_SET: PermissionKey[] = [
  "mvz.dashboard.read",
  "mvz.assignments.read",
  "mvz.bovinos.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.exports.read",
  "mvz.notifications.read",
  "mvz.ranch.read",
  "mvz.ranch.animals.read",
  "mvz.ranch.clinical.read",
  "mvz.ranch.vaccinations.read",
  "mvz.ranch.vaccinations.write",
  "mvz.ranch.incidents.read",
  "mvz.ranch.incidents.write",
  "mvz.ranch.reports.read",
  "mvz.ranch.documents.read",
  "mvz.ranch.documents.write",
  "mvz.ranch.visits.read",
  "mvz.ranch.visits.write",
];
export const PRODUCER_MVZ_INTERNAL_PERMISSION_SET: PermissionKey[] = [
  "mvz.assignments.read",
  "mvz.bovinos.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.notifications.read",
  "mvz.ranch.read",
  "mvz.ranch.animals.read",
  "mvz.ranch.clinical.read",
  "mvz.ranch.vaccinations.read",
  "mvz.ranch.vaccinations.write",
  "mvz.ranch.incidents.read",
  "mvz.ranch.incidents.write",
  "mvz.ranch.reports.read",
  "mvz.ranch.documents.read",
  "mvz.ranch.documents.write",
  "mvz.ranch.visits.read",
  "mvz.ranch.visits.write",
];
const PRODUCER_PERMISSION_SET: PermissionKey[] = [
  "producer.dashboard.read",
  "producer.tenant.read",
  "producer.tenant.write",
  "producer.upp.read",
  "producer.upp.write",
  "producer.bovinos.read",
  "producer.bovinos.write",
  "producer.movements.read",
  "producer.movements.write",
  "producer.exports.read",
  "producer.exports.write",
  "producer.documents.read",
  "producer.documents.write",
  "producer.notifications.read",
  "producer.profile.read",
  "producer.profile.write",
  "producer.employees.read",
  "producer.employees.write",
  "producer.roles.read",
  "producer.roles.write",
  "producer.collars.read",
  "producer.collars.write",
];
const PRODUCER_EMPLOYEE_PERMISSION_SET: PermissionKey[] = [
  "producer.dashboard.read",
  "producer.upp.read",
  "producer.bovinos.read",
  "producer.bovinos.write",
  "producer.movements.read",
  "producer.movements.write",
  "producer.exports.read",
  "producer.notifications.read",
  "producer.collars.read",
  "producer.collars.write",
];
const PRODUCER_VIEWER_PERMISSION_SET: PermissionKey[] = [
  "producer.dashboard.read",
  "producer.upp.read",
  "producer.bovinos.read",
  "producer.movements.read",
  "producer.exports.read",
  "producer.notifications.read",
  "producer.collars.read",
];

export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  tenant_admin: ADMIN_PERMISSION_SET,
  mvz_government: MVZ_GOVERNMENT_PERMISSION_SET,
  mvz_internal: MVZ_TENANT_INTERNAL_PERMISSION_SET,
  producer: PRODUCER_PERMISSION_SET,
  employee: PRODUCER_EMPLOYEE_PERMISSION_SET,
  producer_viewer: PRODUCER_VIEWER_PERMISSION_SET,
};

export function resolveDefaultPermissionsForTenantRole(
  tenantType: TenantPanelType,
  roleKey: string | null | undefined
): PermissionKey[] {
  const compatibleRole = deriveCompatibleRole(tenantType, roleKey);

  if (tenantType === "producer" && roleKey === "mvz_internal") {
    return PRODUCER_MVZ_INTERNAL_PERMISSION_SET;
  }

  return ROLE_DEFAULT_PERMISSIONS[compatibleRole];
}

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function deriveCompatibleRole(
  tenantType: TenantPanelType,
  roleKey: string | null | undefined
): AppRole {
  if (tenantType === "government") {
    return "tenant_admin";
  }

  if (tenantType === "producer") {
    if (roleKey === "mvz_internal") {
      return "mvz_internal";
    }

    if (roleKey === "employee") {
      return "employee";
    }

    if (roleKey === "producer_viewer") {
      return "producer_viewer";
    }

    return "producer";
  }

  return roleKey === "mvz_internal" ? "mvz_internal" : "mvz_government";
}

const ROLE_ALIASES: Record<string, AppRole> = {
  admin: "tenant_admin",
  government: "tenant_admin",
  goverment: "tenant_admin",
  gov: "tenant_admin",
  mvz: "mvz_government",
};

export function normalizeAppRole(value: string | null | undefined): AppRole | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (isAppRole(normalized)) {
    return normalized;
  }

  return ROLE_ALIASES[normalized] ?? null;
}

export function isTenantAdminRole(role: AppRole): boolean {
  return role === "tenant_admin";
}

export function isProducerViewRole(role: AppRole): boolean {
  return role === "producer" || role === "employee" || role === "producer_viewer";
}

export function isMvzViewRole(role: AppRole): boolean {
  return role === "mvz_government" || role === "mvz_internal";
}

export function redirectPathForRole(role: AppRole): string {
  if (isTenantAdminRole(role)) {
    return "/admin";
  }

  if (isProducerViewRole(role)) {
    return "/producer";
  }

  return "/mvz";
}

export const PRODUCER_SETTINGS_NAV_PERMISSIONS: PermissionKey[] = [
  "producer.tenant.read",
  "producer.tenant.write",
  "producer.upp.read",
  "producer.upp.write",
  "producer.employees.read",
  "producer.employees.write",
  "producer.roles.read",
  "producer.roles.write",
];

export const MVZ_SETTINGS_NAV_PERMISSIONS: PermissionKey[] = [
  "mvz.tenant.read",
  "mvz.tenant.write",
  "mvz.assignments.read",
];

export const ADMIN_SETTINGS_NAV_PERMISSIONS: PermissionKey[] = [
  "admin.tenant.read",
  "admin.tenant.write",
  "admin.audit.read",
  "admin.employees.read",
  "admin.employees.write",
  "admin.roles.read",
  "admin.roles.write",
];

export function hasAnyPermission(permissions: PermissionKey[], expected: PermissionKey[]) {
  return expected.some((permission) => permissions.includes(permission));
}

export function resolveAdminPermissions(pathname: string): PermissionKey[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "admin") {
    return [];
  }

  if (segments.length === 1) {
    return ["admin.dashboard.read"];
  }

  if (segments[1] === "profile") {
    return [];
  }

  if (segments[1] === "settings" || segments[1] === "audit" || segments[1] === "normative") {
    return [...ADMIN_SETTINGS_NAV_PERMISSIONS];
  }

  if (segments[1] === "producers") {
    return ["admin.producers.read"];
  }

  if (segments[1] === "mvz") {
    return ["admin.mvz.read"];
  }

  if (segments[1] === "quarantines") {
    return ["admin.quarantines.read"];
  }

  if (segments[1] === "exports") {
    return ["admin.exports.read"];
  }

  if (segments[1] === "appointments") {
    return ["admin.appointments.read"];
  }

  return [];
}

export function resolvePanelHomePath(options: {
  panelType: TenantPanelType;
  permissions: PermissionKey[];
  isMvzInternal?: boolean;
}): string {
  const { panelType, permissions, isMvzInternal = false } = options;

  if (panelType === "government") {
    if (hasAnyPermission(permissions, ["admin.dashboard.read"])) {
      return "/admin";
    }

    if (hasAnyPermission(permissions, ["admin.producers.read"])) {
      return "/admin/producers";
    }

    if (hasAnyPermission(permissions, ["admin.mvz.read"])) {
      return "/admin/mvz";
    }

    if (hasAnyPermission(permissions, ["admin.quarantines.read"])) {
      return "/admin/quarantines";
    }

    if (hasAnyPermission(permissions, ["admin.exports.read"])) {
      return "/admin/exports";
    }

    if (hasAnyPermission(permissions, ["admin.appointments.read"])) {
      return "/admin/appointments";
    }

    if (hasAnyPermission(permissions, ADMIN_SETTINGS_NAV_PERMISSIONS)) {
      return "/admin/settings";
    }

    return "/admin/profile";
  }

  if (panelType === "producer") {
    if (hasAnyPermission(permissions, ["producer.upp.read", "producer.dashboard.read"])) {
      return "/producer";
    }

    if (hasAnyPermission(permissions, PRODUCER_SETTINGS_NAV_PERMISSIONS)) {
      return "/producer/settings";
    }

    return "/producer/profile";
  }

  if (isMvzInternal || hasAnyPermission(permissions, ["mvz.assignments.read", "mvz.dashboard.read"])) {
    return "/mvz";
  }

  if (hasAnyPermission(permissions, MVZ_SETTINGS_NAV_PERMISSIONS)) {
    return "/mvz/settings";
  }

  return "/mvz/profile";
}

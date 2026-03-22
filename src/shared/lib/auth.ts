export const APP_ROLES = [
  "tenant_admin",
  "producer",
  "employee",
  "producer_viewer",
  "mvz_government",
  "mvz_internal",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

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

const ADMIN_PERMISSION_SET = [...ALL_PERMISSION_KEYS] as PermissionKey[];
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
  "mvz.members.read",
  "mvz.members.write",
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
const MVZ_INTERNAL_PERMISSION_SET: PermissionKey[] = [
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
];
const PRODUCER_VIEWER_PERMISSION_SET: PermissionKey[] = [
  "producer.dashboard.read",
  "producer.upp.read",
  "producer.bovinos.read",
  "producer.movements.read",
  "producer.exports.read",
  "producer.notifications.read",
];

export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  tenant_admin: ADMIN_PERMISSION_SET,
  mvz_government: MVZ_GOVERNMENT_PERMISSION_SET,
  mvz_internal: MVZ_INTERNAL_PERMISSION_SET,
  producer: PRODUCER_PERMISSION_SET,
  employee: PRODUCER_EMPLOYEE_PERMISSION_SET,
  producer_viewer: PRODUCER_VIEWER_PERMISSION_SET,
};

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
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

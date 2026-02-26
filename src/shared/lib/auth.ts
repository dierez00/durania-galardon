export const APP_ROLES = [
  "tenant_admin",
  "producer",
  "employee",
  "mvz_government",
  "mvz_internal",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  tenant_admin: "ADMIN Gobierno",
  producer: "Productor",
  employee: "Empleado",
  mvz_government: "MVZ Gobierno",
  mvz_internal: "MVZ Interno",
};

export const PERMISSION_KEYS = [
  "admin.dashboard.read",
  "admin.producers.read",
  "admin.producers.write",
  "admin.mvz.read",
  "admin.mvz.write",
  "admin.quarantines.read",
  "admin.quarantines.write",
  "admin.exports.read",
  "admin.exports.write",
  "admin.normative.read",
  "admin.normative.write",
  "admin.audit.read",
  "admin.appointments.read",
  "admin.appointments.write",
  "mvz.dashboard.read",
  "mvz.assignments.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.exports.read",
  "mvz.exports.write",
  "producer.dashboard.read",
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
const MVZ_PERMISSION_SET: PermissionKey[] = [
  "mvz.dashboard.read",
  "mvz.assignments.read",
  "mvz.tests.read",
  "mvz.tests.write",
  "mvz.tests.sync",
  "mvz.exports.read",
  "mvz.exports.write",
];
const PRODUCER_PERMISSION_SET: PermissionKey[] = [
  "producer.dashboard.read",
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
  "producer.employees.read",
  "producer.employees.write",
];

export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  tenant_admin: ADMIN_PERMISSION_SET,
  mvz_government: MVZ_PERMISSION_SET,
  mvz_internal: MVZ_PERMISSION_SET,
  producer: PRODUCER_PERMISSION_SET,
  employee: PRODUCER_PERMISSION_SET,
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
  return role === "producer" || role === "employee";
}

export function isMvzViewRole(role: AppRole): boolean {
  return role === "mvz_government" || role === "mvz_internal";
}

export function redirectPathForRole(role: AppRole): string {
  if (isTenantAdminRole(role)) {
    return "/admin";
  }

  if (isProducerViewRole(role)) {
    return "/producer/dashboard";
  }

  return "/mvz/dashboard";
}

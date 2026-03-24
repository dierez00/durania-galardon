import type { AuditoriaLog } from "@/modules/admin/auditoria/domain/entities/AuditoriaLogEntity";

export const auditoriaLogsMock: AuditoriaLog[] = [
  {
    id: "log-1",
    actor_user_id: "usr-001",
    role_key: "tenant_admin",
    action: "create",
    resource: "producer",
    resource_id: "prod-1",
    created_at: "2025-12-01T10:23:00Z",
  },
  {
    id: "log-2",
    actor_user_id: "usr-002",
    role_key: "mvz_government",
    action: "update",
    resource: "test",
    resource_id: "tst-9",
    created_at: "2025-12-02T14:05:00Z",
  },
  {
    id: "log-3",
    actor_user_id: "usr-001",
    role_key: "tenant_admin",
    action: "export",
    resource: "exportacion",
    resource_id: "exp-3",
    created_at: "2025-12-03T09:00:00Z",
  },
];

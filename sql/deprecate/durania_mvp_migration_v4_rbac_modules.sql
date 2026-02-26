-- ============================================================
-- DURANIA MVP PRO - Migration Script for Supabase v4
-- RBAC permissions, audit trail and operational modules
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role_key      TEXT,
  action        TEXT NOT NULL,
  resource      TEXT NOT NULL,
  resource_id   TEXT,
  payload_json  JSONB,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);

-- ============================================================
-- STATE QUARANTINES
-- ============================================================

CREATE TABLE IF NOT EXISTS state_quarantines (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  upp_id               UUID REFERENCES upps(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'suspended')),
  quarantine_type      TEXT NOT NULL DEFAULT 'operational' CHECK (quarantine_type IN ('state', 'operational')),
  title                TEXT NOT NULL,
  reason               TEXT,
  geojson              JSONB,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at          TIMESTAMPTZ,
  epidemiological_note TEXT,
  released_by_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_user_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_state_quarantines_tenant_status ON state_quarantines(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_state_quarantines_upp ON state_quarantines(upp_id);

-- ============================================================
-- EXPORT REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS export_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  producer_id             UUID REFERENCES producers(id) ON DELETE SET NULL,
  upp_id                  UUID REFERENCES upps(id) ON DELETE SET NULL,
  requested_by_user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status                  TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'mvz_validated', 'final_approved', 'blocked', 'rejected')),
  compliance_60_rule      BOOLEAN,
  tb_br_validated         BOOLEAN,
  blue_tag_assigned       BOOLEAN,
  monthly_bucket          DATE,
  metrics_json            JSONB,
  blocked_reason          TEXT,
  validated_by_mvz_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by_admin_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_requests_tenant_status ON export_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_export_requests_upp ON export_requests(upp_id);
CREATE INDEX IF NOT EXISTS idx_export_requests_monthly ON export_requests(tenant_id, monthly_bucket);

-- ============================================================
-- MOVEMENT REQUESTS (REEMO)
-- ============================================================

CREATE TABLE IF NOT EXISTS movement_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  producer_id          UUID REFERENCES producers(id) ON DELETE SET NULL,
  upp_id               UUID REFERENCES upps(id) ON DELETE SET NULL,
  requested_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'cancelled')),
  qr_code              TEXT,
  route_note           TEXT,
  incidence_note       TEXT,
  movement_date        DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movement_requests_tenant_status ON movement_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_movement_requests_upp ON movement_requests(upp_id);

-- ============================================================
-- NORMATIVE SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS normative_settings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key                TEXT NOT NULL,
  value_json         JSONB NOT NULL,
  effective_from     DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until    DATE,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  changed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_normative_settings_tenant_key ON normative_settings(tenant_id, key, status);

-- ============================================================
-- NOTIFICATION EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_key       TEXT,
  category       TEXT NOT NULL,
  title          TEXT NOT NULL,
  message        TEXT,
  severity       TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  related_upp_id UUID REFERENCES upps(id) ON DELETE SET NULL,
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_tenant_user ON notification_events(tenant_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_tenant_role ON notification_events(tenant_id, role_key, created_at DESC);

-- ============================================================
-- FIELD TEST SYNC EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS field_test_sync_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mvz_user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_mutation_id TEXT NOT NULL,
  field_test_id      UUID REFERENCES field_tests(id) ON DELETE SET NULL,
  payload_json       JSONB,
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, mvz_user_id, client_mutation_id)
);

CREATE INDEX IF NOT EXISTS idx_field_test_sync_events_tenant_synced ON field_test_sync_events(tenant_id, synced_at DESC);

-- ============================================================
-- PERMISSIONS SEED (RBAC)
-- ============================================================

INSERT INTO permissions (key, description, module) VALUES
  ('admin.dashboard.read', 'Ver dashboard estatal admin', 'admin'),
  ('admin.users.read', 'Ver usuarios', 'admin'),
  ('admin.users.create', 'Crear usuarios', 'admin'),
  ('admin.users.update', 'Editar usuarios', 'admin'),
  ('admin.users.delete', 'Eliminar usuarios', 'admin'),
  ('admin.users.roles', 'Cambiar rol usuarios', 'admin'),
  ('admin.producers.read', 'Ver productores', 'admin'),
  ('admin.producers.write', 'Gestionar productores', 'admin'),
  ('admin.mvz.read', 'Ver MVZ', 'admin'),
  ('admin.mvz.write', 'Gestionar MVZ', 'admin'),
  ('admin.upps.read', 'Ver UPP', 'admin'),
  ('admin.upps.write', 'Gestionar UPP', 'admin'),
  ('admin.quarantines.read', 'Ver cuarentenas', 'admin'),
  ('admin.quarantines.write', 'Gestionar cuarentenas', 'admin'),
  ('admin.exports.read', 'Ver exportaciones', 'admin'),
  ('admin.exports.write', 'Gestionar exportaciones', 'admin'),
  ('admin.normative.read', 'Ver normativa', 'admin'),
  ('admin.normative.write', 'Gestionar normativa', 'admin'),
  ('admin.audit.read', 'Ver bitacora', 'admin'),
  ('admin.reports.export', 'Exportar reportes', 'admin'),
  ('mvz.dashboard.read', 'Ver dashboard MVZ', 'mvz'),
  ('mvz.assignments.read', 'Ver asignaciones MVZ', 'mvz'),
  ('mvz.bovinos.read', 'Ver bovinos asignados', 'mvz'),
  ('mvz.tests.read', 'Ver pruebas sanitarias MVZ', 'mvz'),
  ('mvz.tests.write', 'Registrar pruebas sanitarias MVZ', 'mvz'),
  ('mvz.tests.sync', 'Sincronizar pruebas offline', 'mvz'),
  ('mvz.quarantines.read', 'Ver cuarentenas operativas', 'mvz'),
  ('mvz.quarantines.write', 'Gestionar cuarentenas operativas', 'mvz'),
  ('mvz.exports.read', 'Ver validaciones de exportacion', 'mvz'),
  ('mvz.exports.write', 'Validar exportaciones', 'mvz'),
  ('mvz.notifications.read', 'Ver notificaciones sanitarias', 'mvz'),
  ('producer.dashboard.read', 'Ver dashboard productor', 'producer'),
  ('producer.upp.read', 'Ver UPP propias', 'producer'),
  ('producer.bovinos.read', 'Ver bovinos propios', 'producer'),
  ('producer.bovinos.write', 'Registrar bovinos propios', 'producer'),
  ('producer.movements.read', 'Ver movilizaciones propias', 'producer'),
  ('producer.movements.write', 'Crear movilizaciones REEMO', 'producer'),
  ('producer.exports.read', 'Ver exportaciones propias', 'producer'),
  ('producer.exports.write', 'Solicitar exportaciones', 'producer'),
  ('producer.notifications.read', 'Ver notificaciones propias', 'producer'),
  ('producer.profile.read', 'Ver perfil productor', 'producer'),
  ('producer.profile.write', 'Editar perfil productor', 'producer')
ON CONFLICT (key) DO NOTHING;

WITH role_permission_matrix AS (
  SELECT role_key, permission_key
  FROM (
    VALUES
      ('tenant_admin', 'admin.dashboard.read'),
      ('tenant_admin', 'admin.users.read'),
      ('tenant_admin', 'admin.users.create'),
      ('tenant_admin', 'admin.users.update'),
      ('tenant_admin', 'admin.users.delete'),
      ('tenant_admin', 'admin.users.roles'),
      ('tenant_admin', 'admin.producers.read'),
      ('tenant_admin', 'admin.producers.write'),
      ('tenant_admin', 'admin.mvz.read'),
      ('tenant_admin', 'admin.mvz.write'),
      ('tenant_admin', 'admin.upps.read'),
      ('tenant_admin', 'admin.upps.write'),
      ('tenant_admin', 'admin.quarantines.read'),
      ('tenant_admin', 'admin.quarantines.write'),
      ('tenant_admin', 'admin.exports.read'),
      ('tenant_admin', 'admin.exports.write'),
      ('tenant_admin', 'admin.normative.read'),
      ('tenant_admin', 'admin.normative.write'),
      ('tenant_admin', 'admin.audit.read'),
      ('tenant_admin', 'admin.reports.export'),
      ('tenant_admin', 'mvz.dashboard.read'),
      ('tenant_admin', 'mvz.assignments.read'),
      ('tenant_admin', 'mvz.bovinos.read'),
      ('tenant_admin', 'mvz.tests.read'),
      ('tenant_admin', 'mvz.tests.write'),
      ('tenant_admin', 'mvz.tests.sync'),
      ('tenant_admin', 'mvz.quarantines.read'),
      ('tenant_admin', 'mvz.quarantines.write'),
      ('tenant_admin', 'mvz.exports.read'),
      ('tenant_admin', 'mvz.exports.write'),
      ('tenant_admin', 'mvz.notifications.read'),
      ('tenant_admin', 'producer.dashboard.read'),
      ('tenant_admin', 'producer.upp.read'),
      ('tenant_admin', 'producer.bovinos.read'),
      ('tenant_admin', 'producer.bovinos.write'),
      ('tenant_admin', 'producer.movements.read'),
      ('tenant_admin', 'producer.movements.write'),
      ('tenant_admin', 'producer.exports.read'),
      ('tenant_admin', 'producer.exports.write'),
      ('tenant_admin', 'producer.notifications.read'),
      ('tenant_admin', 'producer.profile.read'),
      ('tenant_admin', 'producer.profile.write'),
      ('mvz_government', 'mvz.dashboard.read'),
      ('mvz_government', 'mvz.assignments.read'),
      ('mvz_government', 'mvz.bovinos.read'),
      ('mvz_government', 'mvz.tests.read'),
      ('mvz_government', 'mvz.tests.write'),
      ('mvz_government', 'mvz.tests.sync'),
      ('mvz_government', 'mvz.quarantines.read'),
      ('mvz_government', 'mvz.quarantines.write'),
      ('mvz_government', 'mvz.exports.read'),
      ('mvz_government', 'mvz.exports.write'),
      ('mvz_government', 'mvz.notifications.read'),
      ('mvz_internal', 'mvz.dashboard.read'),
      ('mvz_internal', 'mvz.assignments.read'),
      ('mvz_internal', 'mvz.bovinos.read'),
      ('mvz_internal', 'mvz.tests.read'),
      ('mvz_internal', 'mvz.tests.write'),
      ('mvz_internal', 'mvz.tests.sync'),
      ('mvz_internal', 'mvz.quarantines.read'),
      ('mvz_internal', 'mvz.quarantines.write'),
      ('mvz_internal', 'mvz.exports.read'),
      ('mvz_internal', 'mvz.exports.write'),
      ('mvz_internal', 'mvz.notifications.read'),
      ('producer', 'producer.dashboard.read'),
      ('producer', 'producer.upp.read'),
      ('producer', 'producer.bovinos.read'),
      ('producer', 'producer.bovinos.write'),
      ('producer', 'producer.movements.read'),
      ('producer', 'producer.movements.write'),
      ('producer', 'producer.exports.read'),
      ('producer', 'producer.exports.write'),
      ('producer', 'producer.notifications.read'),
      ('producer', 'producer.profile.read'),
      ('producer', 'producer.profile.write'),
      ('employee', 'producer.dashboard.read'),
      ('employee', 'producer.upp.read'),
      ('employee', 'producer.bovinos.read'),
      ('employee', 'producer.bovinos.write'),
      ('employee', 'producer.movements.read'),
      ('employee', 'producer.movements.write'),
      ('employee', 'producer.exports.read'),
      ('employee', 'producer.exports.write'),
      ('employee', 'producer.notifications.read'),
      ('employee', 'producer.profile.read'),
      ('employee', 'producer.profile.write')
  ) AS m(role_key, permission_key)
)
INSERT INTO tenant_role_permissions (tenant_role_id, permission_id)
SELECT tr.id, p.id
FROM tenant_roles tr
JOIN role_permission_matrix rpm ON rpm.role_key = tr.key
JOIN permissions p ON p.key = rpm.permission_key
LEFT JOIN tenant_role_permissions trp
  ON trp.tenant_role_id = tr.id
 AND trp.permission_id = p.id
WHERE trp.tenant_role_id IS NULL;

-- ============================================================
-- RLS ENABLEMENT
-- ============================================================

ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_quarantines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE normative_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_test_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AuditLogs: tenant admin read"
  ON audit_logs FOR SELECT
  USING (tenant_id IS NOT NULL AND auth_has_tenant_role(tenant_id, 'tenant_admin'));

CREATE POLICY "StateQuarantines: tenant members read"
  ON state_quarantines FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "StateQuarantines: tenant admin write"
  ON state_quarantines FOR ALL
  USING (auth_has_tenant_role(tenant_id, 'tenant_admin'));

CREATE POLICY "ExportRequests: tenant members read"
  ON export_requests FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "ExportRequests: tenant members write by permission"
  ON export_requests FOR ALL
  USING (
    auth_has_tenant_role(tenant_id, 'tenant_admin')
    OR auth_has_tenant_permission(tenant_id, 'mvz.exports.write')
    OR auth_has_tenant_permission(tenant_id, 'producer.exports.write')
  );

CREATE POLICY "MovementRequests: tenant members read"
  ON movement_requests FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "MovementRequests: tenant members write by permission"
  ON movement_requests FOR ALL
  USING (
    auth_has_tenant_role(tenant_id, 'tenant_admin')
    OR auth_has_tenant_permission(tenant_id, 'producer.movements.write')
  );

CREATE POLICY "NormativeSettings: tenant members read"
  ON normative_settings FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "NormativeSettings: tenant admin write"
  ON normative_settings FOR ALL
  USING (auth_has_tenant_role(tenant_id, 'tenant_admin'));

CREATE POLICY "NotificationEvents: self or role"
  ON notification_events FOR SELECT
  USING (
    auth_has_tenant_role(tenant_id, 'tenant_admin')
    OR user_id = auth.uid()
    OR auth_has_tenant_role(tenant_id, role_key)
  );

CREATE POLICY "NotificationEvents: tenant admin write"
  ON notification_events FOR ALL
  USING (auth_has_tenant_role(tenant_id, 'tenant_admin'));

CREATE POLICY "FieldTestSyncEvents: tenant members read"
  ON field_test_sync_events FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "FieldTestSyncEvents: mvz write"
  ON field_test_sync_events FOR ALL
  USING (
    auth_has_tenant_role(tenant_id, 'tenant_admin')
    OR auth_has_tenant_permission(tenant_id, 'mvz.tests.sync')
  );

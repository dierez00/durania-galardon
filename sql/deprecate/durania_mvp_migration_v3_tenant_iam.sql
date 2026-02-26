-- ============================================================
-- DURANIA MVP PRO - Migration Script for Supabase v3
-- Tenant IAM + producer/mvz route model
-- ============================================================
-- Objetivo:
--   - Migrar de roles globales (user_roles) a roles por tenant.
--   - Crear CRM inicial de citas de landing.
--   - Agregar tenant_id a tablas operativas principales.
--   - Preparar funciones/politicas RLS tenant-aware.
--
-- Nota:
--   - user_roles y role_permissions se mantienen como legado temporal
--     para referencia historica (deprecated) y no deben usarse en app nueva.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'inactive', 'blocked')),
  created_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TENANT IAM
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'inactive', 'suspended')),
  invited_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS tenant_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  name       TEXT NOT NULL,
  is_system  BOOLEAN NOT NULL DEFAULT FALSE,
  priority   INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS tenant_role_permissions (
  tenant_role_id UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS tenant_user_roles (
  membership_id       UUID NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
  tenant_role_id      UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (membership_id, tenant_role_id)
);

-- ============================================================
-- LANDING CRM APPOINTMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  requested_service TEXT NOT NULL,
  requested_date    DATE,
  requested_time    TEXT,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN ('requested', 'contacted', 'scheduled', 'discarded')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOOTSTRAP TENANT UNICO INICIAL
-- ============================================================

INSERT INTO tenants (slug, name)
VALUES ('default-tenant', 'Default Tenant')
ON CONFLICT (slug) DO NOTHING;

-- memberships para perfiles activos
INSERT INTO tenant_memberships (tenant_id, user_id, status)
SELECT t.id, p.id, CASE WHEN p.status = 'active' THEN 'active' ELSE 'inactive' END
FROM profiles p
JOIN tenants t ON t.slug = 'default-tenant'
LEFT JOIN tenant_memberships tm ON tm.tenant_id = t.id AND tm.user_id = p.id
WHERE tm.id IS NULL;

-- roles de sistema por tenant
INSERT INTO tenant_roles (tenant_id, key, name, is_system, priority)
SELECT t.id, v.key, v.name, TRUE, v.priority
FROM tenants t
CROSS JOIN (
  VALUES
    ('tenant_admin',   'Administrador Tenant', 1),
    ('producer',       'Productor',            20),
    ('employee',       'Empleado',             30),
    ('mvz_government', 'MVZ Gobierno',         40),
    ('mvz_internal',   'MVZ Interno',          50)
) AS v(key, name, priority)
LEFT JOIN tenant_roles tr ON tr.tenant_id = t.id AND tr.key = v.key
WHERE tr.id IS NULL;

-- backfill de roles globales -> tenant roles
INSERT INTO tenant_user_roles (membership_id, tenant_role_id)
SELECT DISTINCT tm.id AS membership_id, tr.id AS tenant_role_id
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
JOIN tenants t ON t.slug = 'default-tenant'
JOIN tenant_memberships tm ON tm.tenant_id = t.id AND tm.user_id = ur.user_id
JOIN tenant_roles tr ON tr.tenant_id = t.id
  AND tr.key = CASE
    WHEN r.key = 'admin' THEN 'tenant_admin'
    WHEN r.key = 'mvz' THEN 'mvz_government'
    WHEN r.key = 'producer' THEN 'producer'
    ELSE 'employee'
  END
LEFT JOIN tenant_user_roles tur ON tur.membership_id = tm.id AND tur.tenant_role_id = tr.id
WHERE tur.membership_id IS NULL;

-- ============================================================
-- AGREGAR tenant_id A TABLAS OPERATIVAS
-- ============================================================

ALTER TABLE producers             ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE upps                  ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE user_upp_access       ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE mvz_profiles          ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE mvz_upp_assignments   ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE producer_documents    ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE animals               ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE field_tests           ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- backfill tenant_id al tenant inicial
UPDATE producers p
SET tenant_id = t.id
FROM tenants t
WHERE t.slug = 'default-tenant' AND p.tenant_id IS NULL;

UPDATE upps u
SET tenant_id = COALESCE(u.tenant_id, p.tenant_id)
FROM producers p
WHERE u.producer_id = p.id AND u.tenant_id IS NULL;

UPDATE user_upp_access uua
SET tenant_id = COALESCE(uua.tenant_id, u.tenant_id)
FROM upps u
WHERE uua.upp_id = u.id AND uua.tenant_id IS NULL;

UPDATE mvz_profiles mp
SET tenant_id = t.id
FROM tenants t
WHERE t.slug = 'default-tenant' AND mp.tenant_id IS NULL;

UPDATE mvz_upp_assignments mua
SET tenant_id = COALESCE(mua.tenant_id, mp.tenant_id, u.tenant_id)
FROM mvz_profiles mp, upps u
WHERE mua.mvz_profile_id = mp.id
  AND mua.upp_id = u.id
  AND mua.tenant_id IS NULL;

UPDATE producer_documents pd
SET tenant_id = COALESCE(pd.tenant_id, p.tenant_id)
FROM producers p
WHERE pd.producer_id = p.id AND pd.tenant_id IS NULL;

UPDATE animals a
SET tenant_id = COALESCE(a.tenant_id, u.tenant_id)
FROM upps u
WHERE a.upp_id = u.id AND a.tenant_id IS NULL;

UPDATE field_tests ft
SET tenant_id = COALESCE(ft.tenant_id, u.tenant_id)
FROM upps u
WHERE ft.upp_id = u.id AND ft.tenant_id IS NULL;

-- foreign keys + not null
ALTER TABLE producers           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE upps                ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE user_upp_access     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE mvz_profiles        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE mvz_upp_assignments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE producer_documents  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE animals             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE field_tests         ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'producers_tenant_fk') THEN
    ALTER TABLE producers ADD CONSTRAINT producers_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'upps_tenant_fk') THEN
    ALTER TABLE upps ADD CONSTRAINT upps_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_upp_access_tenant_fk') THEN
    ALTER TABLE user_upp_access ADD CONSTRAINT user_upp_access_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mvz_profiles_tenant_fk') THEN
    ALTER TABLE mvz_profiles ADD CONSTRAINT mvz_profiles_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mvz_assignments_tenant_fk') THEN
    ALTER TABLE mvz_upp_assignments ADD CONSTRAINT mvz_assignments_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'producer_documents_tenant_fk') THEN
    ALTER TABLE producer_documents ADD CONSTRAINT producer_documents_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'animals_tenant_fk') THEN
    ALTER TABLE animals ADD CONSTRAINT animals_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'field_tests_tenant_fk') THEN
    ALTER TABLE field_tests ADD CONSTRAINT field_tests_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- indices tenant
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_user   ON tenant_memberships(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_user_roles_membership     ON tenant_user_roles(membership_id);
CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant              ON tenant_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_tenant      ON appointment_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_producers_tenant                 ON producers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upps_tenant                      ON upps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_upp_access_tenant           ON user_upp_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mvz_profiles_tenant              ON mvz_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mvz_assignments_tenant           ON mvz_upp_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_producer_documents_tenant        ON producer_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_animals_tenant                   ON animals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_field_tests_tenant               ON field_tests(tenant_id);

-- ============================================================
-- FUNCIONES RLS TENANT-AWARE
-- ============================================================

CREATE OR REPLACE FUNCTION auth_in_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_memberships tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION auth_has_tenant_role(p_tenant_id UUID, role_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_memberships tm
    JOIN tenant_user_roles tur ON tur.membership_id = tm.id
    JOIN tenant_roles tr ON tr.id = tur.tenant_role_id
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tr.key = role_key
  );
$$;

CREATE OR REPLACE FUNCTION auth_has_tenant_permission(p_tenant_id UUID, permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_memberships tm
    JOIN tenant_user_roles tur ON tur.membership_id = tm.id
    JOIN tenant_role_permissions trp ON trp.tenant_role_id = tur.tenant_role_id
    JOIN permissions p ON p.id = trp.permission_id
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND p.key = permission_key
  );
$$;

-- ============================================================
-- RLS: habilitar nuevas tablas
-- ============================================================

ALTER TABLE tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_role_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_requests     ENABLE ROW LEVEL SECURITY;

-- tenants: miembros ven; tenant_admin gestiona
CREATE POLICY "Tenants: miembros leen"
  ON tenants FOR SELECT
  USING (auth_in_tenant(id));

CREATE POLICY "Tenants: tenant_admin gestiona"
  ON tenants FOR ALL
  USING (auth_has_tenant_role(id, 'tenant_admin'));

-- memberships
CREATE POLICY "Memberships: miembro se ve"
  ON tenant_memberships FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "Memberships: tenant_admin gestiona"
  ON tenant_memberships FOR ALL
  USING (auth_has_tenant_role(tenant_id, 'tenant_admin'));

-- roles tenant
CREATE POLICY "TenantRoles: miembros leen"
  ON tenant_roles FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "TenantRoles: tenant_admin escribe"
  ON tenant_roles FOR ALL
  USING (auth_has_tenant_role(tenant_id, 'tenant_admin'));

-- role permissions
CREATE POLICY "TenantRolePermissions: miembros leen"
  ON tenant_role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_roles tr
      WHERE tr.id = tenant_role_permissions.tenant_role_id
        AND auth_in_tenant(tr.tenant_id)
    )
  );

CREATE POLICY "TenantRolePermissions: tenant_admin escribe"
  ON tenant_role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_roles tr
      WHERE tr.id = tenant_role_permissions.tenant_role_id
        AND auth_has_tenant_role(tr.tenant_id, 'tenant_admin')
    )
  );

-- tenant_user_roles
CREATE POLICY "TenantUserRoles: miembros leen"
  ON tenant_user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_memberships tm
      WHERE tm.id = tenant_user_roles.membership_id
        AND auth_in_tenant(tm.tenant_id)
    )
  );

CREATE POLICY "TenantUserRoles: tenant_admin escribe"
  ON tenant_user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_memberships tm
      WHERE tm.id = tenant_user_roles.membership_id
        AND auth_has_tenant_role(tm.tenant_id, 'tenant_admin')
    )
  );

-- appointment_requests: publico crea; tenant_admin y employee leen/actualizan
CREATE POLICY "AppointmentRequests: public create"
  ON appointment_requests FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "AppointmentRequests: tenant_admin lee"
  ON appointment_requests FOR SELECT
  USING (auth_has_tenant_role(tenant_id, 'tenant_admin'));

CREATE POLICY "AppointmentRequests: tenant_admin actualiza"
  ON appointment_requests FOR UPDATE
  USING (auth_has_tenant_role(tenant_id, 'tenant_admin'));

-- ============================================================
-- RLS BASE TENANT-AWARE EN TABLAS OPERATIVAS
-- (ajuste incremental sobre politicas existentes)
-- ============================================================

CREATE POLICY "Producers: tenant scope"
  ON producers FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "UPPs: tenant scope"
  ON upps FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "Animals: tenant scope"
  ON animals FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "FieldTests: tenant scope"
  ON field_tests FOR SELECT
  USING (auth_in_tenant(tenant_id));

-- ============================================================
-- LEGACY GLOBAL IAM (DEPRECATED)
-- ============================================================
-- Tablas globales legacy mantenidas temporalmente para referencia:
--   - user_roles
--   - role_permissions
-- No deben usarse por la nueva capa de aplicacion tenant-aware.
-- ============================================================

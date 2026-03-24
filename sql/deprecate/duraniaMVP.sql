-- ============================================================
-- DURANIA MVP PRO - Migration Script for Supabase v2
-- Integrado con Supabase Auth (auth.users)
-- ============================================================
-- NOTAS:
--   - Se elimina la tabla `users` propia. La fuente de verdad
--     de autenticación es auth.users (manejada por Supabase).
--   - Se crea una tabla `profiles` pública que extiende auth.users
--     con campos de la app (status, metadata, etc.).
--   - Todas las FKs que antes apuntaban a users.id ahora apuntan
--     a profiles.id (que es el mismo UUID que auth.uid()).
--   - Un trigger crea automáticamente el profile al registrarse.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extiende auth.users)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,              -- denormalizado desde auth.users para consultas fáciles
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: crea un profile automáticamente cuando un usuario se registra en Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- IDENTITY & RBAC
-- ============================================================

CREATE TABLE roles (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key   TEXT NOT NULL UNIQUE, -- admin | mvz | producer
  name  TEXT NOT NULL
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE, -- upp.read | animals.update | etc.
  description TEXT,
  module      TEXT -- identity | documents | sanitary | etc. (nullable)
);

CREATE TABLE user_roles (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- PRODUCERS & UPPs
-- ============================================================

CREATE TABLE producers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL, -- nullable
  curp        TEXT UNIQUE,                                      -- nullable
  full_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE upps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id     UUID NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
  upp_code        TEXT UNIQUE,       -- nullable
  name            TEXT NOT NULL,
  address_text    TEXT,
  location_lat    NUMERIC,
  location_lng    NUMERIC,
  hectares_total  NUMERIC,           -- nullable
  herd_limit      INTEGER,           -- nullable
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'quarantined', 'suspended')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_upp_access (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  upp_id              UUID NOT NULL REFERENCES upps(id) ON DELETE CASCADE,
  access_level        TEXT NOT NULL
                        CHECK (access_level IN ('owner', 'editor', 'viewer')),
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive')),
  granted_by_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL, -- nullable
  granted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, upp_id)
);

-- ============================================================
-- MVZ
-- ============================================================

CREATE TABLE mvz_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  license_number  TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mvz_upp_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mvz_profile_id  UUID NOT NULL REFERENCES mvz_profiles(id) ON DELETE CASCADE,
  upp_id          UUID NOT NULL REFERENCES upps(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at   TIMESTAMPTZ,  -- nullable
  UNIQUE (mvz_profile_id, upp_id)
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE document_types (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                       TEXT NOT NULL UNIQUE, -- ine | curp | deed | etc.
  name                      TEXT NOT NULL,
  requires_expiry           BOOLEAN NOT NULL DEFAULT FALSE,
  requires_identity_match   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE producer_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id           UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  document_type_id      UUID NOT NULL REFERENCES document_types(id) ON DELETE RESTRICT,
  file_storage_key      TEXT NOT NULL,
  file_hash             TEXT NOT NULL,
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'validated', 'expired', 'rejected')),
  is_current            BOOLEAN NOT NULL DEFAULT TRUE,
  expiry_date           DATE,             -- nullable
  extracted_fields      JSONB,            -- OCR output (flexible)
  ocr_confidence        NUMERIC,          -- nullable
  ocr_validated_at      TIMESTAMPTZ,      -- nullable
  ocr_engine_version    TEXT              -- nullable
);

-- Partial unique index: solo un documento vigente por tipo por productor
CREATE UNIQUE INDEX producer_documents_current_unique
  ON producer_documents (producer_id, document_type_id)
  WHERE is_current = TRUE;

-- ============================================================
-- ANIMALS
-- ============================================================

CREATE TABLE animals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upp_id            UUID NOT NULL REFERENCES upps(id) ON DELETE RESTRICT,
  siniiga_tag       TEXT NOT NULL UNIQUE,
  sex               TEXT NOT NULL CHECK (sex IN ('M', 'F')),
  birth_date        DATE,              -- nullable
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'blocked', 'in_transit', 'inactive')),
  mother_animal_id  UUID REFERENCES animals(id) ON DELETE SET NULL, -- nullable self-ref
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SANITARY TESTS
-- ============================================================

CREATE TABLE test_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE, -- tb | br
  name            TEXT NOT NULL,
  validity_days   INTEGER NOT NULL
);

CREATE TABLE field_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id       UUID NOT NULL REFERENCES animals(id) ON DELETE RESTRICT,
  upp_id          UUID NOT NULL REFERENCES upps(id) ON DELETE RESTRICT,
  mvz_profile_id  UUID NOT NULL REFERENCES mvz_profiles(id) ON DELETE RESTRICT,
  test_type_id    UUID NOT NULL REFERENCES test_types(id) ON DELETE RESTRICT,
  sample_date     DATE NOT NULL,
  result          TEXT NOT NULL CHECK (result IN ('negative', 'positive', 'inconclusive')),
  valid_until     DATE,        -- nullable
  captured_lat    NUMERIC,     -- nullable
  captured_lng    NUMERIC,     -- nullable
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES (performance)
-- ============================================================

CREATE INDEX idx_upps_producer_id         ON upps(producer_id);
CREATE INDEX idx_animals_upp_id           ON animals(upp_id);
CREATE INDEX idx_animals_status           ON animals(status);
CREATE INDEX idx_field_tests_animal_id    ON field_tests(animal_id);
CREATE INDEX idx_field_tests_upp_id       ON field_tests(upp_id);
CREATE INDEX idx_field_tests_mvz          ON field_tests(mvz_profile_id);
CREATE INDEX idx_field_tests_sample_date  ON field_tests(sample_date);
CREATE INDEX idx_producer_docs_producer   ON producer_documents(producer_id);
CREATE INDEX idx_producer_docs_status     ON producer_documents(status);
CREATE INDEX idx_mvz_assignments_upp      ON mvz_upp_assignments(upp_id);
CREATE INDEX idx_user_upp_access_user     ON user_upp_access(user_id);
CREATE INDEX idx_producers_user_id        ON producers(user_id);

-- ============================================================
-- SEED DATA - Roles
-- ============================================================

INSERT INTO roles (key, name) VALUES
  ('admin',    'Administrador'),
  ('mvz',      'Médico Veterinario Zootecnista'),
  ('producer', 'Productor');

-- ============================================================
-- SEED DATA - Test types
-- ============================================================

INSERT INTO test_types (key, name, validity_days) VALUES
  ('tb', 'Tuberculosis', 365),
  ('br', 'Brucelosis',   365);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE producers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE upps                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_upp_access      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvz_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvz_upp_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_tests          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS para políticas RLS
-- ============================================================

-- Verifica si el usuario autenticado tiene un rol determinado
CREATE OR REPLACE FUNCTION auth_has_role(role_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.key = role_key
  );
$$;

-- Verifica si el usuario autenticado tiene acceso a una UPP
CREATE OR REPLACE FUNCTION auth_has_upp_access(p_upp_id UUID, min_level TEXT DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_upp_access uua
    WHERE uua.user_id = auth.uid()
      AND uua.upp_id = p_upp_id
      AND uua.status = 'active'
      AND CASE min_level
            WHEN 'owner'  THEN uua.access_level = 'owner'
            WHEN 'editor' THEN uua.access_level IN ('owner', 'editor')
            ELSE TRUE
          END
  );
$$;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- profiles: cada usuario ve y edita solo su propio perfil; admin lo ve todo
CREATE POLICY "Profiles: propio usuario"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Profiles: admin todo"
  ON profiles FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "Profiles: usuario actualiza el suyo"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- roles / permissions / test_types / document_types: lectura pública
CREATE POLICY "Roles: lectura pública"          ON roles          FOR SELECT USING (TRUE);
CREATE POLICY "Permissions: lectura pública"    ON permissions    FOR SELECT USING (TRUE);
CREATE POLICY "Test types: lectura pública"     ON test_types     FOR SELECT USING (TRUE);
CREATE POLICY "Doc types: lectura pública"      ON document_types FOR SELECT USING (TRUE);

-- roles / permissions: solo admin escribe
CREATE POLICY "Roles: solo admin escribe"       ON roles       FOR ALL USING (auth_has_role('admin'));
CREATE POLICY "Permissions: solo admin escribe" ON permissions FOR ALL USING (auth_has_role('admin'));

-- user_roles: admin gestiona; usuario lee los suyos
CREATE POLICY "UserRoles: admin gestiona"
  ON user_roles FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "UserRoles: usuario lee los suyos"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- role_permissions: solo admin
CREATE POLICY "RolePermissions: solo admin"
  ON role_permissions FOR ALL
  USING (auth_has_role('admin'));

-- producers: admin todo; productor ve/edita el suyo
CREATE POLICY "Producers: admin todo"
  ON producers FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "Producers: productor ve el suyo"
  ON producers FOR SELECT
  USING (user_id = auth.uid());

-- upps: admin todo; acceso via user_upp_access
CREATE POLICY "UPPs: admin todo"
  ON upps FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "UPPs: acceso por user_upp_access"
  ON upps FOR SELECT
  USING (auth_has_upp_access(id));

-- user_upp_access: admin todo; usuario ve los suyos
CREATE POLICY "UPPAccess: admin todo"
  ON user_upp_access FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "UPPAccess: usuario ve los suyos"
  ON user_upp_access FOR SELECT
  USING (user_id = auth.uid());

-- mvz_profiles: admin todo; MVZ ve/edita el suyo
CREATE POLICY "MVZProfiles: admin todo"
  ON mvz_profiles FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "MVZProfiles: MVZ ve el suyo"
  ON mvz_profiles FOR SELECT
  USING (user_id = auth.uid());

-- mvz_upp_assignments: admin todo; MVZ ve los suyos
CREATE POLICY "MVZAssignments: admin todo"
  ON mvz_upp_assignments FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "MVZAssignments: MVZ ve los suyos"
  ON mvz_upp_assignments FOR SELECT
  USING (
    mvz_profile_id IN (
      SELECT id FROM mvz_profiles WHERE user_id = auth.uid()
    )
  );

-- producer_documents: admin todo; productor ve los suyos; MVZ asignado puede leer
CREATE POLICY "Docs: admin todo"
  ON producer_documents FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "Docs: productor ve los suyos"
  ON producer_documents FOR SELECT
  USING (
    producer_id IN (
      SELECT id FROM producers WHERE user_id = auth.uid()
    )
  );

-- animals: admin todo; miembros de la UPP leen; editor/owner escriben
CREATE POLICY "Animals: admin todo"
  ON animals FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "Animals: lectura para miembros UPP"
  ON animals FOR SELECT
  USING (auth_has_upp_access(upp_id, 'viewer'));

CREATE POLICY "Animals: escritura para editor/owner"
  ON animals FOR INSERT
  WITH CHECK (auth_has_upp_access(upp_id, 'editor'));

CREATE POLICY "Animals: update para editor/owner"
  ON animals FOR UPDATE
  USING (auth_has_upp_access(upp_id, 'editor'));

-- field_tests: admin todo; MVZ gestiona los suyos; miembros UPP leen
CREATE POLICY "FieldTests: admin todo"
  ON field_tests FOR ALL
  USING (auth_has_role('admin'));

CREATE POLICY "FieldTests: MVZ gestiona los suyos"
  ON field_tests FOR ALL
  USING (
    mvz_profile_id IN (
      SELECT id FROM mvz_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "FieldTests: miembros UPP leen"
  ON field_tests FOR SELECT
  USING (auth_has_upp_access(upp_id, 'viewer'));

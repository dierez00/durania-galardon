-- ============================================================
-- DURANIA MVP PRO — Migration Final (v5 Clean)
-- Modelo multi-tenant con 3 tipos de entorno:
--   government → panel admin (1 instancia global)
--   producer   → panel productor (1 tenant por productor)
--   mvz        → panel MVZ global (1 tenant por MVZ externo)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. IDENTIDAD
--    profiles es la extensión pública de auth.users.
--    Toda FK de la app apunta a profiles(id).
-- ============================================================

CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TENANTS
--    type define el panel al que pertenece el tenant:
--      'government' → único, panel administrativo (gobierno)
--      'producer'   → uno por productor, panel productor/ranchos
--      'mvz'        → uno por MVZ externo, panel MVZ auditor
-- ============================================================

CREATE TABLE public.tenants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type               TEXT NOT NULL
                       CHECK (type IN ('government', 'producer', 'mvz')),
  slug               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'inactive', 'blocked')),
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. IAM POR TENANT
--    Sin roles globales. El tipo de tenant + el rol interno
--    determinan el panel y los permisos del usuario.
--
--    Roles de sistema por tipo de tenant:
--      government → tenant_admin
--      producer   → producer, employee, mvz_internal
--      mvz        → mvz_government
-- ============================================================

CREATE TABLE public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  description TEXT,
  module      TEXT  -- 'admin' | 'mvz' | 'producer' (nullable)
);

-- Membresía de un usuario en un tenant
CREATE TABLE public.tenant_memberships (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'inactive', 'suspended')),
  invited_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

-- Roles definidos dentro de un tenant
CREATE TABLE public.tenant_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,   -- tenant_admin | producer | employee | mvz_internal | mvz_government
  name       TEXT NOT NULL,
  is_system  BOOLEAN NOT NULL DEFAULT FALSE,
  priority   INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

-- Permisos asignados a un rol dentro de un tenant
CREATE TABLE public.tenant_role_permissions (
  tenant_role_id UUID NOT NULL REFERENCES public.tenant_roles(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_role_id, permission_id)
);

-- Roles asignados a un miembro dentro de su tenant
CREATE TABLE public.tenant_user_roles (
  membership_id       UUID NOT NULL REFERENCES public.tenant_memberships(id) ON DELETE CASCADE,
  tenant_role_id      UUID NOT NULL REFERENCES public.tenant_roles(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (membership_id, tenant_role_id)
);

-- ============================================================
-- 4. PRODUCTORES
--    Un productor tiene:
--      - Una fila en 'producers' con sus datos personales
--      - Un tenant propio de tipo 'producer' (owner_tenant_id)
--    El admin (government) crea al productor y su tenant.
--    El tenant del productor es donde viven sus ranchos y empleados.
-- ============================================================

CREATE TABLE public.producers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  -- ^^ tenant de tipo 'producer' que pertenece a este productor
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  curp             TEXT UNIQUE,
  full_name        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantizar que solo haya un productor por tenant de tipo producer
CREATE UNIQUE INDEX producers_owner_tenant_unique ON public.producers(owner_tenant_id);

-- ============================================================
-- 5. UPPs (RANCHOS)
--    Pertenecen al tenant del productor (type = 'producer').
--    El admin gobierno puede crearlos pero viven en el tenant del productor.
-- ============================================================

CREATE TABLE public.upps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  -- ^^ siempre el tenant del productor (type = 'producer')
  producer_id    UUID NOT NULL REFERENCES public.producers(id) ON DELETE RESTRICT,
  upp_code       TEXT UNIQUE,
  name           TEXT NOT NULL,
  address_text   TEXT,
  location_lat   NUMERIC,
  location_lng   NUMERIC,
  hectares_total NUMERIC,
  herd_limit     INTEGER,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'quarantined', 'suspended')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Acceso granular de empleados/mvz_internal a una UPP específica dentro del tenant
CREATE TABLE public.user_upp_access (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  upp_id              UUID NOT NULL REFERENCES public.upps(id) ON DELETE CASCADE,
  access_level        TEXT NOT NULL CHECK (access_level IN ('owner', 'editor', 'viewer')),
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive')),
  granted_by_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, upp_id)
);

-- ============================================================
-- 6. MVZ GLOBAL (AUDITOR EXTERNO)
--    Un MVZ global tiene:
--      - Una fila en 'mvz_profiles' con sus datos profesionales
--      - Un tenant propio de tipo 'mvz' (owner_tenant_id)
--    Puede ser asignado a UPPs de DISTINTOS tenants productores.
--    mvz_upp_assignments es la tabla cross-tenant por diseño.
-- ============================================================

CREATE TABLE public.mvz_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  -- ^^ tenant de tipo 'mvz' que pertenece a este MVZ global
  user_id          UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  license_number   TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX mvz_profiles_owner_tenant_unique ON public.mvz_profiles(owner_tenant_id);

-- Asignación de MVZ global a UPPs (cross-tenant)
-- El MVZ pertenece a su tenant 'mvz', pero audita UPPs de tenants 'producer'
CREATE TABLE public.mvz_upp_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mvz_profile_id UUID NOT NULL REFERENCES public.mvz_profiles(id) ON DELETE CASCADE,
  upp_id         UUID NOT NULL REFERENCES public.upps(id) ON DELETE CASCADE,
  -- sin tenant_id: esta tabla es explícitamente cross-tenant
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive')),
  assigned_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- ^^ debe ser un usuario del tenant government
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at  TIMESTAMPTZ,
  UNIQUE (mvz_profile_id, upp_id)
);

-- ============================================================
-- 7. DOCUMENTOS
-- ============================================================

CREATE TABLE public.document_types (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                     TEXT NOT NULL UNIQUE,
  name                    TEXT NOT NULL,
  requires_expiry         BOOLEAN NOT NULL DEFAULT FALSE,
  requires_identity_match BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.producer_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  producer_id        UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  document_type_id   UUID NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  file_storage_key   TEXT NOT NULL,
  file_hash          TEXT NOT NULL,
  uploaded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'validated', 'expired', 'rejected')),
  is_current         BOOLEAN NOT NULL DEFAULT TRUE,
  expiry_date        DATE,
  extracted_fields   JSONB,
  ocr_confidence     NUMERIC,
  ocr_validated_at   TIMESTAMPTZ,
  ocr_engine_version TEXT
);

CREATE UNIQUE INDEX producer_documents_current_unique
  ON public.producer_documents (producer_id, document_type_id)
  WHERE is_current = TRUE;

-- ============================================================
-- 8. ANIMALES
-- ============================================================

CREATE TABLE public.animals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  upp_id           UUID NOT NULL REFERENCES public.upps(id) ON DELETE RESTRICT,
  siniiga_tag      TEXT NOT NULL UNIQUE,
  sex              TEXT NOT NULL CHECK (sex IN ('M', 'F')),
  birth_date       DATE,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'blocked', 'in_transit', 'inactive')),
  mother_animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. PRUEBAS SANITARIAS
-- ============================================================

CREATE TABLE public.test_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  validity_days INTEGER NOT NULL
);

CREATE TABLE public.field_tests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  -- ^^ tenant del productor dueño del rancho donde se realiza la prueba
  animal_id      UUID NOT NULL REFERENCES public.animals(id) ON DELETE RESTRICT,
  upp_id         UUID NOT NULL REFERENCES public.upps(id) ON DELETE RESTRICT,
  mvz_profile_id UUID NOT NULL REFERENCES public.mvz_profiles(id) ON DELETE RESTRICT,
  test_type_id   UUID NOT NULL REFERENCES public.test_types(id) ON DELETE RESTRICT,
  sample_date    DATE NOT NULL,
  result         TEXT NOT NULL CHECK (result IN ('negative', 'positive', 'inconclusive')),
  valid_until    DATE,
  captured_lat   NUMERIC,
  captured_lng   NUMERIC,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deduplicación sync offline (idempotente por cliente MVZ)
CREATE TABLE public.field_test_sync_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mvz_user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_mutation_id TEXT NOT NULL,
  field_test_id      UUID REFERENCES public.field_tests(id) ON DELETE SET NULL,
  payload_json       JSONB,
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mvz_user_id, client_mutation_id)
);

-- ============================================================
-- 10. MÓDULOS OPERATIVOS
-- ============================================================

-- Cuarentenas (gobierno las declara, pueden afectar UPPs de productores)
CREATE TABLE public.state_quarantines (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declared_by_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  -- ^^ siempre el tenant government
  upp_id               UUID REFERENCES public.upps(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'released', 'suspended')),
  quarantine_type      TEXT NOT NULL DEFAULT 'operational'
                         CHECK (quarantine_type IN ('state', 'operational')),
  title                TEXT NOT NULL,
  reason               TEXT,
  geojson              JSONB,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at          TIMESTAMPTZ,
  epidemiological_note TEXT,
  released_by_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_user_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Solicitudes de exportación (pertenecen al tenant del productor)
CREATE TABLE public.export_requests (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  producer_id               UUID REFERENCES public.producers(id) ON DELETE SET NULL,
  upp_id                    UUID REFERENCES public.upps(id) ON DELETE SET NULL,
  requested_by_user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                    TEXT NOT NULL DEFAULT 'requested'
                              CHECK (status IN ('requested', 'mvz_validated', 'final_approved', 'blocked', 'rejected')),
  compliance_60_rule        BOOLEAN,
  tb_br_validated           BOOLEAN,
  blue_tag_assigned         BOOLEAN,
  monthly_bucket            DATE,
  metrics_json              JSONB,
  blocked_reason            TEXT,
  validated_by_mvz_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by_admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Movilizaciones REEMO (pertenecen al tenant del productor)
CREATE TABLE public.movement_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  producer_id          UUID REFERENCES public.producers(id) ON DELETE SET NULL,
  upp_id               UUID REFERENCES public.upps(id) ON DELETE SET NULL,
  requested_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'requested'
                         CHECK (status IN ('requested', 'approved', 'rejected', 'cancelled')),
  qr_code              TEXT,
  route_note           TEXT,
  incidence_note       TEXT,
  movement_date        DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuración normativa (pertenece al tenant government)
CREATE TABLE public.normative_settings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key                TEXT NOT NULL,
  value_json         JSONB NOT NULL,
  effective_from     DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until    DATE,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'inactive')),
  changed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key, effective_from)
);

-- Solo una configuración activa por clave por tenant
CREATE UNIQUE INDEX normative_settings_active_unique
  ON public.normative_settings (tenant_id, key)
  WHERE status = 'active';

-- ============================================================
-- 11. CRM DE CITAS (LANDING)
--     Las citas llegan al tenant government.
-- ============================================================

CREATE TABLE public.appointment_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
-- 12. NOTIFICACIONES
--     Cross-tenant: el gobierno puede notificar a usuarios
--     de tenants de productores o MVZ.
--     sender_tenant_id = quien envía
--     target_user_id   = quien recibe (puede ser de otro tenant)
-- ============================================================

CREATE TABLE public.notification_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- ^^ tenant que genera la notificación
  target_user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- ^^ nullable: si es personal a un usuario específico
  target_tenant_id  UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- ^^ nullable: si es broadcast a todos los miembros activos de un tenant
  target_role_key   TEXT,
  -- ^^ nullable: si es broadcast filtrado por rol dentro del target_tenant
  category          TEXT NOT NULL,
  title             TEXT NOT NULL,
  message           TEXT,
  severity          TEXT NOT NULL DEFAULT 'info'
                      CHECK (severity IN ('info', 'warning', 'critical')),
  related_upp_id    UUID REFERENCES public.upps(id) ON DELETE SET NULL,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Al menos uno de los targets debe estar definido
  CONSTRAINT notification_has_target
    CHECK (target_user_id IS NOT NULL OR target_tenant_id IS NOT NULL)
);

-- ============================================================
-- 13. AUDIT LOG
-- ============================================================

CREATE TABLE public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role_key      TEXT,
  action        TEXT NOT NULL,   -- 'create' | 'update' | 'delete' | 'login' | etc.
  resource      TEXT NOT NULL,   -- nombre de la tabla/entidad
  resource_id   TEXT,
  payload_json  JSONB,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. ÍNDICES DE PERFORMANCE
-- ============================================================

-- Tenants & IAM
CREATE INDEX idx_tenant_memberships_tenant_user  ON public.tenant_memberships(tenant_id, user_id);
CREATE INDEX idx_tenant_memberships_user         ON public.tenant_memberships(user_id);
CREATE INDEX idx_tenant_roles_tenant             ON public.tenant_roles(tenant_id);
CREATE INDEX idx_tenant_user_roles_membership    ON public.tenant_user_roles(membership_id);
CREATE INDEX idx_tenants_type                    ON public.tenants(type);

-- Producers & UPPs
CREATE INDEX idx_producers_owner_tenant          ON public.producers(owner_tenant_id);
CREATE INDEX idx_producers_user                  ON public.producers(user_id);
CREATE INDEX idx_upps_tenant                     ON public.upps(tenant_id);
CREATE INDEX idx_upps_producer                   ON public.upps(producer_id);
CREATE INDEX idx_user_upp_access_tenant          ON public.user_upp_access(tenant_id);
CREATE INDEX idx_user_upp_access_user            ON public.user_upp_access(user_id);

-- MVZ
CREATE INDEX idx_mvz_profiles_owner_tenant       ON public.mvz_profiles(owner_tenant_id);
CREATE INDEX idx_mvz_upp_assignments_mvz         ON public.mvz_upp_assignments(mvz_profile_id);
CREATE INDEX idx_mvz_upp_assignments_upp         ON public.mvz_upp_assignments(upp_id);

-- Documents
CREATE INDEX idx_producer_documents_tenant       ON public.producer_documents(tenant_id);
CREATE INDEX idx_producer_documents_producer     ON public.producer_documents(producer_id);
CREATE INDEX idx_producer_documents_status       ON public.producer_documents(status);

-- Animals
CREATE INDEX idx_animals_tenant                  ON public.animals(tenant_id);
CREATE INDEX idx_animals_upp                     ON public.animals(upp_id);
CREATE INDEX idx_animals_status                  ON public.animals(status);

-- Field tests
CREATE INDEX idx_field_tests_tenant              ON public.field_tests(tenant_id);
CREATE INDEX idx_field_tests_animal              ON public.field_tests(animal_id);
CREATE INDEX idx_field_tests_upp                 ON public.field_tests(upp_id);
CREATE INDEX idx_field_tests_mvz                 ON public.field_tests(mvz_profile_id);
CREATE INDEX idx_field_tests_sample_date         ON public.field_tests(sample_date);
CREATE INDEX idx_field_test_sync_events_mvz      ON public.field_test_sync_events(mvz_user_id, synced_at DESC);

-- Módulos operativos
CREATE INDEX idx_state_quarantines_declared_by   ON public.state_quarantines(declared_by_tenant_id, status);
CREATE INDEX idx_state_quarantines_upp           ON public.state_quarantines(upp_id);
CREATE INDEX idx_export_requests_tenant_status   ON public.export_requests(tenant_id, status);
CREATE INDEX idx_export_requests_upp             ON public.export_requests(upp_id);
CREATE INDEX idx_export_requests_monthly         ON public.export_requests(tenant_id, monthly_bucket);
CREATE INDEX idx_movement_requests_tenant_status ON public.movement_requests(tenant_id, status);
CREATE INDEX idx_movement_requests_upp           ON public.movement_requests(upp_id);
CREATE INDEX idx_normative_settings_tenant_key   ON public.normative_settings(tenant_id, key, status);
CREATE INDEX idx_appointment_requests_tenant_at  ON public.appointment_requests(tenant_id, status, created_at DESC);

-- Notifications & Audit
CREATE INDEX idx_notification_events_target_user ON public.notification_events(target_user_id, created_at DESC);
CREATE INDEX idx_notification_events_target_ten  ON public.notification_events(target_tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_tenant_at            ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor                ON public.audit_logs(actor_user_id, created_at DESC);

-- ============================================================
-- 15. SEED DATA — Catálogos globales
-- ============================================================

INSERT INTO public.test_types (key, name, validity_days) VALUES
  ('tb', 'Tuberculosis', 365),
  ('br', 'Brucelosis',   365);

INSERT INTO public.permissions (key, description, module) VALUES
  -- Panel Admin (gobierno)
  ('admin.dashboard.read',        'Ver dashboard estatal',             'admin'),
  ('admin.users.read',            'Ver usuarios',                      'admin'),
  ('admin.users.create',          'Crear usuarios',                    'admin'),
  ('admin.users.update',          'Editar usuarios',                   'admin'),
  ('admin.users.delete',          'Eliminar usuarios',                 'admin'),
  ('admin.users.roles',           'Cambiar roles de usuarios',         'admin'),
  ('admin.producers.read',        'Ver productores',                   'admin'),
  ('admin.producers.write',       'Gestionar productores',             'admin'),
  ('admin.mvz.read',              'Ver MVZ',                           'admin'),
  ('admin.mvz.write',             'Gestionar MVZ',                     'admin'),
  ('admin.upps.read',             'Ver UPPs',                          'admin'),
  ('admin.upps.write',            'Gestionar UPPs',                    'admin'),
  ('admin.quarantines.read',      'Ver cuarentenas',                   'admin'),
  ('admin.quarantines.write',     'Gestionar cuarentenas',             'admin'),
  ('admin.exports.read',          'Ver exportaciones',                 'admin'),
  ('admin.exports.write',         'Gestionar exportaciones',           'admin'),
  ('admin.normative.read',        'Ver normativa',                     'admin'),
  ('admin.normative.write',       'Gestionar normativa',               'admin'),
  ('admin.audit.read',            'Ver bitácora',                      'admin'),
  ('admin.reports.export',        'Exportar reportes',                 'admin'),
  ('admin.appointments.read',     'Ver citas CRM',                     'admin'),
  ('admin.appointments.write',    'Gestionar citas CRM',               'admin'),
  -- Panel MVZ global (auditor externo)
  ('mvz.dashboard.read',          'Ver dashboard MVZ',                 'mvz'),
  ('mvz.assignments.read',        'Ver ranchos asignados',             'mvz'),
  ('mvz.bovinos.read',            'Ver bovinos de ranchos asignados',  'mvz'),
  ('mvz.tests.read',              'Ver pruebas sanitarias',            'mvz'),
  ('mvz.tests.write',             'Registrar pruebas sanitarias',      'mvz'),
  ('mvz.tests.sync',              'Sincronizar pruebas offline',       'mvz'),
  ('mvz.quarantines.read',        'Ver cuarentenas operativas',        'mvz'),
  ('mvz.quarantines.write',       'Gestionar cuarentenas operativas',  'mvz'),
  ('mvz.exports.read',            'Ver exportaciones a validar',       'mvz'),
  ('mvz.exports.write',           'Validar exportaciones',             'mvz'),
  ('mvz.notifications.read',      'Ver notificaciones MVZ',            'mvz'),
  -- Panel Productor (dueño y empleados del rancho)
  ('producer.dashboard.read',     'Ver métricas globales de ranchos',  'producer'),
  ('producer.upp.read',           'Ver ranchos propios',               'producer'),
  ('producer.upp.write',          'Editar información de rancho',      'producer'),
  ('producer.bovinos.read',       'Ver bovinos',                       'producer'),
  ('producer.bovinos.write',      'Registrar bovinos',                 'producer'),
  ('producer.movements.read',     'Ver movilizaciones',                'producer'),
  ('producer.movements.write',    'Crear movilizaciones REEMO',        'producer'),
  ('producer.exports.read',       'Ver exportaciones',                 'producer'),
  ('producer.exports.write',      'Solicitar exportaciones',           'producer'),
  ('producer.documents.read',     'Ver documentos',                    'producer'),
  ('producer.documents.write',    'Subir documentos',                  'producer'),
  ('producer.notifications.read', 'Ver notificaciones',                'producer'),
  ('producer.profile.read',       'Ver perfil productor',              'producer'),
  ('producer.profile.write',      'Editar perfil productor',           'producer'),
  ('producer.employees.read',     'Ver empleados del rancho',          'producer'),
  ('producer.employees.write',    'Gestionar empleados del rancho',    'producer')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 16. FUNCIONES HELPER RLS
--     Todas con SECURITY DEFINER + SET search_path = public
-- ============================================================

-- ¿El usuario es miembro activo de este tenant?
CREATE OR REPLACE FUNCTION public.auth_in_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE tenant_id = p_tenant_id
      AND user_id   = auth.uid()
      AND status    = 'active'
  );
$$;

-- ¿El usuario tiene este rol en este tenant?
CREATE OR REPLACE FUNCTION public.auth_has_tenant_role(p_tenant_id UUID, p_role_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships  tm
    JOIN public.tenant_user_roles   tur ON tur.membership_id  = tm.id
    JOIN public.tenant_roles        tr  ON tr.id              = tur.tenant_role_id
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id   = auth.uid()
      AND tm.status    = 'active'
      AND tr.key       = p_role_key
  );
$$;

-- ¿El usuario tiene este permiso en este tenant (vía cualquier rol)?
CREATE OR REPLACE FUNCTION public.auth_has_tenant_permission(p_tenant_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships      tm
    JOIN public.tenant_user_roles       tur ON tur.membership_id  = tm.id
    JOIN public.tenant_role_permissions trp ON trp.tenant_role_id = tur.tenant_role_id
    JOIN public.permissions             p   ON p.id               = trp.permission_id
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id   = auth.uid()
      AND tm.status    = 'active'
      AND p.key        = p_permission_key
  );
$$;

-- ¿El usuario tiene acceso a esta UPP con nivel mínimo requerido?
CREATE OR REPLACE FUNCTION public.auth_has_upp_access(p_upp_id UUID, p_min_level TEXT DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_upp_access
    WHERE user_id = auth.uid()
      AND upp_id  = p_upp_id
      AND status  = 'active'
      AND CASE p_min_level
            WHEN 'owner'  THEN access_level = 'owner'
            WHEN 'editor' THEN access_level IN ('owner', 'editor')
            ELSE TRUE
          END
  );
$$;

-- ¿El usuario MVZ global tiene esta UPP asignada?
CREATE OR REPLACE FUNCTION public.auth_mvz_assigned_to_upp(p_upp_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mvz_upp_assignments mua
    JOIN public.mvz_profiles mp ON mp.id = mua.mvz_profile_id
    WHERE mp.user_id   = auth.uid()
      AND mua.upp_id   = p_upp_id
      AND mua.status   = 'active'
  );
$$;

-- Retorna el tipo de tenant del usuario autenticado (para routing en login)
-- Si el usuario pertenece a múltiples tenants, retorna el de mayor prioridad:
-- government > mvz > producer
CREATE OR REPLACE FUNCTION public.auth_get_panel_type()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.type
  FROM public.tenant_memberships tm
  JOIN public.tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = auth.uid()
    AND tm.status  = 'active'
    AND t.status   = 'active'
  ORDER BY
    CASE t.type
      WHEN 'government' THEN 1
      WHEN 'mvz'        THEN 2
      WHEN 'producer'   THEN 3
    END
  LIMIT 1;
$$;

-- ============================================================
-- 17. ROW LEVEL SECURITY — Habilitar en todas las tablas
-- ============================================================

ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upps                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_upp_access         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvz_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvz_upp_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_types              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_tests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_test_sync_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_quarantines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normative_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 18. POLÍTICAS RLS
--     Regla general:
--       - tenant_admin (government) puede ver/gestionar todo
--       - Cada entidad opera dentro de su tenant
--       - MVZ global tiene acceso cross-tenant solo a sus UPPs asignadas
-- ============================================================

-- PROFILES
CREATE POLICY "profiles: propio usuario"
  ON public.profiles FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- TENANTS: un usuario ve sus tenants; gobierno ve todos
CREATE POLICY "tenants: miembro lee el suyo"
  ON public.tenants FOR SELECT
  USING (public.auth_in_tenant(id));

CREATE POLICY "tenants: gobierno gestiona"
  ON public.tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND tm.status  = 'active'
        AND t.type     = 'government'
    )
  );

-- PERMISSIONS (catálogo global, solo lectura)
CREATE POLICY "permissions: lectura pública"
  ON public.permissions FOR SELECT USING (TRUE);

-- TENANT MEMBERSHIPS
CREATE POLICY "tenant_memberships: miembro lee su tenant"
  ON public.tenant_memberships FOR SELECT
  USING (public.auth_in_tenant(tenant_id) OR user_id = auth.uid());

CREATE POLICY "tenant_memberships: tenant_admin gestiona"
  ON public.tenant_memberships FOR ALL
  USING (public.auth_has_tenant_role(tenant_id, 'tenant_admin'));

-- TENANT ROLES
CREATE POLICY "tenant_roles: miembro lee"
  ON public.tenant_roles FOR SELECT
  USING (public.auth_in_tenant(tenant_id));

CREATE POLICY "tenant_roles: tenant_admin gestiona"
  ON public.tenant_roles FOR ALL
  USING (public.auth_has_tenant_role(tenant_id, 'tenant_admin'));

-- TENANT ROLE PERMISSIONS
CREATE POLICY "tenant_role_permissions: miembro lee"
  ON public.tenant_role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_roles tr
      WHERE tr.id = tenant_role_id
        AND public.auth_in_tenant(tr.tenant_id)
    )
  );

CREATE POLICY "tenant_role_permissions: tenant_admin gestiona"
  ON public.tenant_role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_roles tr
      WHERE tr.id = tenant_role_id
        AND public.auth_has_tenant_role(tr.tenant_id, 'tenant_admin')
    )
  );

-- TENANT USER ROLES
CREATE POLICY "tenant_user_roles: miembro lee"
  ON public.tenant_user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.id = membership_id
        AND public.auth_in_tenant(tm.tenant_id)
    )
  );

CREATE POLICY "tenant_user_roles: tenant_admin gestiona"
  ON public.tenant_user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.id = membership_id
        AND public.auth_has_tenant_role(tm.tenant_id, 'tenant_admin')
    )
  );

-- PRODUCERS
-- Gobierno ve todos; productor ve el suyo
CREATE POLICY "producers: gobierno ve todos"
  ON public.producers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "producers: productor ve el suyo"
  ON public.producers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "producers: gobierno gestiona"
  ON public.producers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );

-- UPPs
-- Miembros del tenant del productor las ven; gobierno las ve todas; MVZ ve las asignadas
CREATE POLICY "upps: miembro de tenant productor lee"
  ON public.upps FOR SELECT
  USING (public.auth_in_tenant(tenant_id));

CREATE POLICY "upps: gobierno ve todas"
  ON public.upps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "upps: mvz ve las asignadas"
  ON public.upps FOR SELECT
  USING (public.auth_mvz_assigned_to_upp(id));

CREATE POLICY "upps: tenant_admin del productor gestiona"
  ON public.upps FOR ALL
  USING (public.auth_has_tenant_role(tenant_id, 'tenant_admin'));

-- USER UPP ACCESS
CREATE POLICY "user_upp_access: usuario ve los suyos o admin"
  ON public.user_upp_access FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  );

CREATE POLICY "user_upp_access: tenant_admin gestiona"
  ON public.user_upp_access FOR ALL
  USING (public.auth_has_tenant_role(tenant_id, 'tenant_admin'));

-- MVZ PROFILES
-- Gobierno ve todos; el propio MVZ ve el suyo
CREATE POLICY "mvz_profiles: gobierno ve todos"
  ON public.mvz_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "mvz_profiles: mvz ve el suyo"
  ON public.mvz_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "mvz_profiles: gobierno gestiona"
  ON public.mvz_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );

-- MVZ UPP ASSIGNMENTS (cross-tenant)
-- Gobierno gestiona; MVZ ve sus propias asignaciones;
-- Productor (tenant_admin) ve qué MVZ tiene asignado en sus UPPs
CREATE POLICY "mvz_upp_assignments: gobierno gestiona"
  ON public.mvz_upp_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );

CREATE POLICY "mvz_upp_assignments: mvz ve las suyas"
  ON public.mvz_upp_assignments FOR SELECT
  USING (
    mvz_profile_id IN (
      SELECT id FROM public.mvz_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "mvz_upp_assignments: productor ve las de sus upps"
  ON public.mvz_upp_assignments FOR SELECT
  USING (
    upp_id IN (
      SELECT id FROM public.upps WHERE public.auth_in_tenant(tenant_id)
    )
  );

-- DOCUMENT TYPES (catálogo global, solo lectura)
CREATE POLICY "document_types: lectura pública"
  ON public.document_types FOR SELECT USING (TRUE);

-- PRODUCER DOCUMENTS
CREATE POLICY "producer_documents: miembro del tenant lee"
  ON public.producer_documents FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "producer_documents: tenant_admin o gobierno gestiona"
  ON public.producer_documents FOR ALL
  USING (
    public.auth_has_tenant_role(tenant_id, 'tenant_admin')
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );

-- ANIMALS
CREATE POLICY "animals: miembro del tenant lee"
  ON public.animals FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "animals: editor/owner de UPP o gobierno crea"
  ON public.animals FOR INSERT
  WITH CHECK (
    public.auth_has_upp_access(upp_id, 'editor')
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  );

CREATE POLICY "animals: editor/owner de UPP o gobierno actualiza"
  ON public.animals FOR UPDATE
  USING (
    public.auth_has_upp_access(upp_id, 'editor')
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  );

-- TEST TYPES (catálogo global, solo lectura)
CREATE POLICY "test_types: lectura pública"
  ON public.test_types FOR SELECT USING (TRUE);

-- FIELD TESTS
-- MVZ (global o interno) registra; miembros del tenant y gobierno leen
CREATE POLICY "field_tests: miembro del tenant o gobierno lee"
  ON public.field_tests FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "field_tests: mvz registra"
  ON public.field_tests FOR INSERT
  WITH CHECK (
    mvz_profile_id IN (
      SELECT id FROM public.mvz_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "field_tests: gobierno gestiona"
  ON public.field_tests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );

-- FIELD TEST SYNC EVENTS
CREATE POLICY "field_test_sync_events: mvz ve y crea los suyos"
  ON public.field_test_sync_events FOR ALL
  USING (mvz_user_id = auth.uid())
  WITH CHECK (mvz_user_id = auth.uid());

-- STATE QUARANTINES
CREATE POLICY "state_quarantines: todos los miembros afectados leen"
  ON public.state_quarantines FOR SELECT
  USING (
    public.auth_has_tenant_role(declared_by_tenant_id, 'tenant_admin')
    OR (upp_id IS NOT NULL AND public.auth_in_tenant(
      (SELECT tenant_id FROM public.upps WHERE id = upp_id)
    ))
    OR (upp_id IS NOT NULL AND public.auth_mvz_assigned_to_upp(upp_id))
  );

CREATE POLICY "state_quarantines: gobierno gestiona"
  ON public.state_quarantines FOR ALL
  USING (public.auth_has_tenant_role(declared_by_tenant_id, 'tenant_admin'));

-- EXPORT REQUESTS
CREATE POLICY "export_requests: miembro del tenant o gobierno lee"
  ON public.export_requests FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "export_requests: productor con permiso crea"
  ON public.export_requests FOR INSERT
  WITH CHECK (public.auth_has_tenant_permission(tenant_id, 'producer.exports.write'));

CREATE POLICY "export_requests: mvz con permiso valida (UPDATE)"
  ON public.export_requests FOR UPDATE
  USING (
    public.auth_has_tenant_permission(tenant_id, 'mvz.exports.write')
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );

-- MOVEMENT REQUESTS
CREATE POLICY "movement_requests: miembro del tenant o gobierno lee"
  ON public.movement_requests FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "movement_requests: productor con permiso crea"
  ON public.movement_requests FOR INSERT
  WITH CHECK (public.auth_has_tenant_permission(tenant_id, 'producer.movements.write'));

CREATE POLICY "movement_requests: gobierno aprueba"
  ON public.movement_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );

-- NORMATIVE SETTINGS
CREATE POLICY "normative_settings: miembros activos leen"
  ON public.normative_settings FOR SELECT
  USING (public.auth_in_tenant(tenant_id));

CREATE POLICY "normative_settings: gobierno gestiona"
  ON public.normative_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );

-- APPOINTMENT REQUESTS (CRM landing → gobierno)
CREATE POLICY "appointment_requests: inserción pública desde landing"
  ON public.appointment_requests FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "appointment_requests: gobierno lee y gestiona"
  ON public.appointment_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

-- NOTIFICATION EVENTS
-- Cada usuario ve las notificaciones dirigidas a él o a su tenant/rol
CREATE POLICY "notification_events: usuario ve las suyas"
  ON public.notification_events FOR SELECT
  USING (
    target_user_id = auth.uid()
    OR (
      target_tenant_id IS NOT NULL
      AND public.auth_in_tenant(target_tenant_id)
      AND (
        target_role_key IS NULL
        OR public.auth_has_tenant_role(target_tenant_id, target_role_key)
      )
    )
  );

CREATE POLICY "notification_events: gobierno crea notificaciones"
  ON public.notification_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
    )
  );

CREATE POLICY "notification_events: usuario marca como leída la suya"
  ON public.notification_events FOR UPDATE
  USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());

-- AUDIT LOGS
-- Solo gobierno lee; inserciones solo por funciones SECURITY DEFINER del sistema
CREATE POLICY "audit_logs: gobierno lee"
  ON public.audit_logs FOR SELECT
  USING (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND t.type = 'government'
        AND public.auth_has_tenant_role(t.id, 'tenant_admin')
    )
  );
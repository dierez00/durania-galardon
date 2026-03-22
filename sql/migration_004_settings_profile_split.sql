-- ============================================================
-- migration_004_settings_profile_split.sql
-- Split Mi perfil vs Config panel, nuevos permisos y sync profiles.email
-- ============================================================

-- 1) profiles.email como espejo denormalizado de auth.users.email
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = LOWER(u.email)
FROM auth.users u
WHERE u.id = p.id
  AND u.email IS NOT NULL
  AND p.email IS DISTINCT FROM LOWER(u.email);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE OR REPLACE FUNCTION public.handle_auth_user_profile_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, LOWER(NEW.email))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_profile_sync();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_profile_sync();

-- 2) Nuevos permisos para settings por panel
INSERT INTO public.permissions (key, description, module) VALUES
  ('producer.tenant.read', 'Ver configuracion del tenant productor', 'producer'),
  ('producer.tenant.write', 'Editar configuracion del tenant productor', 'producer'),
  ('mvz.tenant.read', 'Ver configuracion del tenant MVZ', 'mvz'),
  ('mvz.tenant.write', 'Editar configuracion del tenant MVZ', 'mvz'),
  ('mvz.profile.read', 'Ver ficha profesional MVZ', 'mvz'),
  ('mvz.profile.write', 'Editar ficha profesional MVZ', 'mvz'),
  ('mvz.members.read', 'Ver equipo MVZ', 'mvz'),
  ('mvz.members.write', 'Gestionar equipo MVZ', 'mvz')
ON CONFLICT (key) DO NOTHING;

-- 3) La funcion MVZ debe resolver acceso por tenant, no solo por user_id
CREATE OR REPLACE FUNCTION public.auth_mvz_assigned_to_upp(p_upp_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    JOIN public.mvz_profiles mp ON mp.owner_tenant_id = tm.tenant_id
    JOIN public.mvz_upp_assignments mua ON mua.mvz_profile_id = mp.id
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND t.type = 'mvz'
      AND t.status = 'active'
      AND mp.status = 'active'
      AND mua.status = 'active'
      AND mua.upp_id = p_upp_id
  );
$$;

-- 4) Roles de sistema faltantes para tenants existentes
INSERT INTO public.tenant_roles (tenant_id, key, name, is_system, priority)
SELECT t.id, 'producer_viewer', 'Consulta', TRUE, 30
FROM public.tenants t
WHERE t.type = 'producer'
ON CONFLICT (tenant_id, key) DO NOTHING;

INSERT INTO public.tenant_roles (tenant_id, key, name, is_system, priority)
SELECT t.id, 'mvz_internal', 'MVZ Interno', TRUE, 20
FROM public.tenants t
WHERE t.type = 'mvz'
ON CONFLICT (tenant_id, key) DO NOTHING;

UPDATE public.tenant_roles tr
SET name = CASE
  WHEN tr.key = 'tenant_admin' THEN 'Administrador'
  WHEN tr.key = 'employee' THEN 'Operativo'
  WHEN tr.key = 'producer_viewer' THEN 'Consulta'
  ELSE tr.name
END
FROM public.tenants t
WHERE t.id = tr.tenant_id
  AND (
    (t.type = 'producer' AND tr.key IN ('tenant_admin', 'employee', 'producer_viewer'))
    OR (t.type = 'mvz' AND tr.key = 'tenant_admin')
  );

-- 5) Backfill de permisos por rol del tenant
INSERT INTO public.tenant_role_permissions (tenant_role_id, permission_id)
SELECT tr.id, p.id
FROM public.tenant_roles tr
JOIN public.tenants t ON t.id = tr.tenant_id
JOIN public.permissions p ON p.key = ANY(
  CASE
    WHEN t.type = 'producer' AND tr.key IN ('tenant_admin', 'producer') THEN ARRAY[
      'producer.dashboard.read', 'producer.tenant.read', 'producer.tenant.write',
      'producer.upp.read', 'producer.upp.write',
      'producer.bovinos.read', 'producer.bovinos.write',
      'producer.movements.read', 'producer.movements.write',
      'producer.exports.read', 'producer.exports.write',
      'producer.documents.read', 'producer.documents.write',
      'producer.notifications.read',
      'producer.profile.read', 'producer.profile.write',
      'producer.employees.read', 'producer.employees.write'
    ]
    WHEN t.type = 'producer' AND tr.key = 'employee' THEN ARRAY[
      'producer.dashboard.read',
      'producer.upp.read',
      'producer.bovinos.read', 'producer.bovinos.write',
      'producer.movements.read', 'producer.movements.write',
      'producer.exports.read',
      'producer.notifications.read'
    ]
    WHEN t.type = 'producer' AND tr.key = 'producer_viewer' THEN ARRAY[
      'producer.dashboard.read',
      'producer.upp.read',
      'producer.bovinos.read',
      'producer.movements.read',
      'producer.exports.read',
      'producer.notifications.read'
    ]
    WHEN t.type = 'mvz' AND tr.key = 'tenant_admin' THEN ARRAY[
      'mvz.dashboard.read', 'mvz.assignments.read', 'mvz.bovinos.read',
      'mvz.tests.read', 'mvz.tests.write', 'mvz.tests.sync',
      'mvz.quarantines.read', 'mvz.quarantines.write',
      'mvz.exports.read', 'mvz.exports.write',
      'mvz.notifications.read',
      'mvz.tenant.read', 'mvz.tenant.write',
      'mvz.profile.read', 'mvz.profile.write',
      'mvz.members.read', 'mvz.members.write',
      'mvz.ranch.read',
      'mvz.ranch.animals.read', 'mvz.ranch.clinical.read',
      'mvz.ranch.vaccinations.read', 'mvz.ranch.vaccinations.write',
      'mvz.ranch.incidents.read', 'mvz.ranch.incidents.write',
      'mvz.ranch.reports.read',
      'mvz.ranch.documents.read', 'mvz.ranch.documents.write',
      'mvz.ranch.visits.read', 'mvz.ranch.visits.write'
    ]
    WHEN t.type = 'mvz' AND tr.key = 'mvz_government' THEN ARRAY[
      'mvz.dashboard.read', 'mvz.assignments.read', 'mvz.bovinos.read',
      'mvz.tests.read', 'mvz.tests.write', 'mvz.tests.sync',
      'mvz.quarantines.read', 'mvz.quarantines.write',
      'mvz.exports.read', 'mvz.exports.write',
      'mvz.notifications.read',
      'mvz.tenant.read',
      'mvz.profile.read', 'mvz.profile.write',
      'mvz.ranch.read',
      'mvz.ranch.animals.read', 'mvz.ranch.clinical.read',
      'mvz.ranch.vaccinations.read', 'mvz.ranch.vaccinations.write',
      'mvz.ranch.incidents.read', 'mvz.ranch.incidents.write',
      'mvz.ranch.reports.read',
      'mvz.ranch.documents.read', 'mvz.ranch.documents.write',
      'mvz.ranch.visits.read', 'mvz.ranch.visits.write'
    ]
    WHEN t.type = 'mvz' AND tr.key = 'mvz_internal' THEN ARRAY[
      'mvz.dashboard.read', 'mvz.assignments.read', 'mvz.bovinos.read',
      'mvz.tests.read', 'mvz.tests.write', 'mvz.tests.sync',
      'mvz.exports.read',
      'mvz.notifications.read',
      'mvz.ranch.read',
      'mvz.ranch.animals.read', 'mvz.ranch.clinical.read',
      'mvz.ranch.vaccinations.read', 'mvz.ranch.vaccinations.write',
      'mvz.ranch.incidents.read', 'mvz.ranch.incidents.write',
      'mvz.ranch.reports.read',
      'mvz.ranch.documents.read', 'mvz.ranch.documents.write',
      'mvz.ranch.visits.read', 'mvz.ranch.visits.write'
    ]
    ELSE ARRAY[]::TEXT[]
  END
)
ON CONFLICT (tenant_role_id, permission_id) DO NOTHING;

-- 6) Limpiar permisos legacy que ya no deben abrir Config panel
DELETE FROM public.tenant_role_permissions trp
USING public.tenant_roles tr,
      public.tenants t,
      public.permissions p
WHERE trp.tenant_role_id = tr.id
  AND t.id = tr.tenant_id
  AND p.id = trp.permission_id
  AND t.type = 'producer'
  AND tr.key = 'employee'
  AND p.key IN ('producer.profile.read');

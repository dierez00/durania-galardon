-- ============================================================
-- migration_011_admin_settings_exports_cleanup.sql
-- Admin settings permissions + export soft delete
-- ============================================================

ALTER TABLE public.export_requests
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'export_requests_deleted_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.export_requests
      ADD CONSTRAINT export_requests_deleted_by_user_id_fkey
      FOREIGN KEY (deleted_by_user_id)
      REFERENCES public.profiles(id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;
  END IF;
END $$;

INSERT INTO public.permissions (key, description, module)
VALUES
  ('admin.tenant.read', 'Ver configuracion general del panel administrativo', 'admin'),
  ('admin.tenant.write', 'Editar configuracion general del panel administrativo', 'admin'),
  ('admin.employees.read', 'Ver empleados del panel administrativo', 'admin'),
  ('admin.employees.write', 'Gestionar empleados del panel administrativo', 'admin'),
  ('admin.roles.read', 'Ver roles y permisos del panel administrativo', 'admin'),
  ('admin.roles.write', 'Gestionar roles y permisos del panel administrativo', 'admin')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.tenant_role_permissions (tenant_role_id, permission_id)
SELECT tr.id, p.id
FROM public.tenant_roles tr
JOIN public.tenants t ON t.id = tr.tenant_id
JOIN public.permissions p ON p.key = ANY(
  ARRAY[
    'admin.tenant.read',
    'admin.tenant.write',
    'admin.employees.read',
    'admin.employees.write',
    'admin.roles.read',
    'admin.roles.write'
  ]::TEXT[]
)
WHERE t.type = 'government'
  AND tr.key = 'tenant_admin'
ON CONFLICT (tenant_role_id, permission_id) DO NOTHING;

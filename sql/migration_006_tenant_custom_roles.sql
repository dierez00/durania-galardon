-- ============================================================
-- migration_006_tenant_custom_roles.sql
-- Permisos de administracion de roles por tenant y backfill base
-- ============================================================

INSERT INTO public.permissions (key, description, module)
VALUES
  ('producer.roles.read', 'Ver roles y permisos del tenant productor', 'producer'),
  ('producer.roles.write', 'Gestionar roles y permisos del tenant productor', 'producer'),
  ('mvz.roles.read', 'Ver roles y permisos del tenant MVZ', 'mvz'),
  ('mvz.roles.write', 'Gestionar roles y permisos del tenant MVZ', 'mvz')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.tenant_role_permissions (tenant_role_id, permission_id)
SELECT tr.id, p.id
FROM public.tenant_roles tr
JOIN public.tenants t ON t.id = tr.tenant_id
JOIN public.permissions p ON p.key = ANY(
  CASE
    WHEN t.type = 'producer' AND tr.key IN ('producer', 'tenant_admin') THEN ARRAY[
      'producer.roles.read',
      'producer.roles.write'
    ]
    WHEN t.type = 'mvz' AND tr.key IN ('mvz_government', 'tenant_admin') THEN ARRAY[
      'mvz.roles.read',
      'mvz.roles.write'
    ]
    ELSE ARRAY[]::TEXT[]
  END
)
ON CONFLICT (tenant_role_id, permission_id) DO NOTHING;

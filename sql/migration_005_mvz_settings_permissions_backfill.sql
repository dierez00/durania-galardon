-- ============================================================
-- migration_005_mvz_settings_permissions_backfill.sql
-- Completa permisos de configuracion MVZ despues del split 004
-- ============================================================

INSERT INTO public.tenant_role_permissions (tenant_role_id, permission_id)
SELECT tr.id, p.id
FROM public.tenant_roles tr
JOIN public.tenants t ON t.id = tr.tenant_id
JOIN public.permissions p ON p.key = ANY(
  ARRAY[
    'mvz.tenant.write',
    'mvz.members.read',
    'mvz.members.write'
  ]::TEXT[]
)
WHERE t.type = 'mvz'
  AND tr.key IN ('tenant_admin', 'mvz_government')
ON CONFLICT (tenant_role_id, permission_id) DO NOTHING;

UPDATE public.tenant_roles tr
SET name = 'MVZ Gobierno'
FROM public.tenants t
WHERE t.id = tr.tenant_id
  AND t.type = 'mvz'
  AND tr.key = 'mvz_government'
  AND tr.name IS DISTINCT FROM 'MVZ Gobierno';

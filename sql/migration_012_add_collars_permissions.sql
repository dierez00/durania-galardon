-- Add IoT Collar Management Permissions
-- This migration registers new permissions for admin and producer collar operations

INSERT INTO "public"."permissions" ("id", "key", "description", "module") VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'admin.collars.read', 'Ver inventario de collares IoT', 'admin'),
  ('550e8400-e29b-41d4-a716-446655440001', 'admin.collars.write', 'Gestionar (provisionar, actualizar estado) collares IoT', 'admin'),
  ('550e8400-e29b-41d4-a716-446655440002', 'producer.collars.read', 'Ver collares disponibles', 'producer'),
  ('550e8400-e29b-41d4-a716-446655440003', 'producer.collars.write', 'Asignar/desasignar collares a bovinos', 'producer')
ON CONFLICT ("key") DO NOTHING;



INSERT INTO public.tenant_role_permissions (tenant_role_id, permission_id)
SELECT tr.id, p.id
FROM public.tenant_roles tr
JOIN public.tenants t ON t.id = tr.tenant_id
JOIN public.permissions p ON p.key = ANY(
  CASE
    -- Admin/MVZ/Government roles get admin collar permissions
    WHEN t.type IN ('mvz', 'government') AND tr.key = 'tenant_admin' THEN ARRAY[
      'admin.collars.read', 'admin.collars.write'
    ]
    -- Producer roles get producer collar permissions
    WHEN t.type = 'producer' AND tr.key IN ('tenant_admin', 'producer') THEN ARRAY[
      'producer.collars.read', 'producer.collars.write'
    ]
    ELSE ARRAY[]::text[]
  END
)
ON CONFLICT (tenant_role_id, permission_id) DO NOTHING;
-- ============================================================
-- DURANIA MVP PRO — Seed de Roles por Tenant (v5)
-- Ejecutar una vez por tenant creado, o para todos en batch.
-- Los roles de sistema se asignan según el tipo del tenant.
-- ============================================================

-- Roles de sistema según tipo de tenant
INSERT INTO public.tenant_roles (tenant_id, key, name, is_system, priority)
SELECT t.id, v.key, v.name, TRUE, v.priority
FROM public.tenants t
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    -- Tenant tipo 'government'
    ('government', 'tenant_admin', 'Administrador (Gobierno)', 1),
    -- Tenant tipo 'producer'
    ('producer',   'tenant_admin',   'Administrador Rancho',   1),
    ('producer',   'producer',       'Productor',              10),
    ('producer',   'employee',       'Empleado',               20),
    ('producer',   'mvz_internal',   'MVZ Interno',            30),
    -- Tenant tipo 'mvz'
    ('mvz',        'tenant_admin',   'Administrador MVZ',      1),
    ('mvz',        'mvz_government', 'MVZ Gobierno',           10)
  ) AS r(tenant_type, key, name, priority)
  WHERE r.tenant_type = t.type
) AS v
ON CONFLICT (tenant_id, key) DO NOTHING;

-- Matriz de permisos por rol de sistema
INSERT INTO public.tenant_role_permissions (tenant_role_id, permission_id)
SELECT tr.id, p.id
FROM public.tenant_roles tr
JOIN public.tenants t ON t.id = tr.tenant_id
JOIN public.permissions p ON p.key = ANY(
  CASE
    -- tenant_admin en government: todos los permisos
    WHEN t.type = 'government' AND tr.key = 'tenant_admin' THEN ARRAY[
      'admin.dashboard.read', 'admin.users.read', 'admin.users.create',
      'admin.users.update', 'admin.users.delete', 'admin.users.roles',
      'admin.producers.read', 'admin.producers.write',
      'admin.mvz.read', 'admin.mvz.write',
      'admin.upps.read', 'admin.upps.write',
      'admin.quarantines.read', 'admin.quarantines.write',
      'admin.exports.read', 'admin.exports.write',
      'admin.normative.read', 'admin.normative.write',
      'admin.audit.read', 'admin.reports.export',
      'admin.appointments.read', 'admin.appointments.write'
    ]
    -- tenant_admin en producer: gestión completa del rancho
    WHEN t.type = 'producer' AND tr.key = 'tenant_admin' THEN ARRAY[
      'producer.dashboard.read', 'producer.upp.read', 'producer.upp.write',
      'producer.bovinos.read', 'producer.bovinos.write',
      'producer.movements.read', 'producer.movements.write',
      'producer.exports.read', 'producer.exports.write',
      'producer.documents.read', 'producer.documents.write',
      'producer.notifications.read', 'producer.profile.read', 'producer.profile.write',
      'producer.employees.read', 'producer.employees.write'
    ]
    -- producer: dueño del rancho (igual que tenant_admin en este contexto)
    WHEN t.type = 'producer' AND tr.key = 'producer' THEN ARRAY[
      'producer.dashboard.read', 'producer.upp.read', 'producer.upp.write',
      'producer.bovinos.read', 'producer.bovinos.write',
      'producer.movements.read', 'producer.movements.write',
      'producer.exports.read', 'producer.exports.write',
      'producer.documents.read', 'producer.documents.write',
      'producer.notifications.read', 'producer.profile.read', 'producer.profile.write',
      'producer.employees.read', 'producer.employees.write'
    ]
    -- employee: operaciones del rancho sin gestión de empleados ni documentos
    WHEN t.type = 'producer' AND tr.key = 'employee' THEN ARRAY[
      'producer.dashboard.read', 'producer.upp.read',
      'producer.bovinos.read', 'producer.bovinos.write',
      'producer.movements.read', 'producer.movements.write',
      'producer.exports.read',
      'producer.notifications.read', 'producer.profile.read'
    ]
    -- mvz_internal: igual que employee pero con acceso a pruebas sanitarias
    WHEN t.type = 'producer' AND tr.key = 'mvz_internal' THEN ARRAY[
      'producer.dashboard.read', 'producer.upp.read',
      'producer.bovinos.read',
      'mvz.tests.read', 'mvz.tests.write', 'mvz.tests.sync',
      'mvz.quarantines.read', 'mvz.quarantines.write',
      'producer.notifications.read', 'producer.profile.read'
    ]
    -- tenant_admin en mvz: gestión del perfil MVZ
    WHEN t.type = 'mvz' AND tr.key = 'tenant_admin' THEN ARRAY[
      'mvz.dashboard.read', 'mvz.assignments.read', 'mvz.bovinos.read',
      'mvz.tests.read', 'mvz.tests.write', 'mvz.tests.sync',
      'mvz.quarantines.read', 'mvz.quarantines.write',
      'mvz.exports.read', 'mvz.exports.write', 'mvz.notifications.read'
    ]
    -- mvz_government: auditor externo
    WHEN t.type = 'mvz' AND tr.key = 'mvz_government' THEN ARRAY[
      'mvz.dashboard.read', 'mvz.assignments.read', 'mvz.bovinos.read',
      'mvz.tests.read', 'mvz.tests.write', 'mvz.tests.sync',
      'mvz.quarantines.read', 'mvz.quarantines.write',
      'mvz.exports.read', 'mvz.exports.write', 'mvz.notifications.read'
    ]
    ELSE ARRAY[]::TEXT[]
  END
)
ON CONFLICT (tenant_role_id, permission_id) DO NOTHING;
-- ============================================================
-- DURANIA MVP PRO — Views (v5)
-- Todas las vistas usan SECURITY INVOKER (default) para que
-- RLS se aplique con el contexto del usuario autenticado.
-- ============================================================

-- ============================================================
-- 1. v_user_context
--    Contexto completo del usuario autenticado.
--    Usar en login para routing y en app para validaciones.
--    Retorna una fila por cada rol que tenga el usuario
--    (un usuario con 2 roles en el mismo tenant = 2 filas).
-- ============================================================

CREATE OR REPLACE VIEW public.v_user_context
WITH (security_invoker = true) AS
SELECT
  p.id                          AS user_id,
  p.status                      AS user_status,
  t.id                          AS tenant_id,
  t.type                        AS tenant_type,
  t.slug                        AS tenant_slug,
  t.name                        AS tenant_name,
  t.status                      AS tenant_status,
  tm.id                         AS membership_id,
  tm.status                     AS membership_status,
  tr.key                        AS role_key,
  tr.name                       AS role_name,
  tr.priority                   AS role_priority
FROM public.profiles p
JOIN public.tenant_memberships  tm ON tm.user_id    = p.id
JOIN public.tenants             t  ON t.id          = tm.tenant_id
JOIN public.tenant_user_roles   tur ON tur.membership_id = tm.id
JOIN public.tenant_roles        tr  ON tr.id         = tur.tenant_role_id
WHERE p.id            = auth.uid()
  AND tm.status       = 'active'
  AND t.status        = 'active';

-- ============================================================
-- 2. v_user_permissions
--    Todos los permisos activos del usuario autenticado.
--    Útil para frontend: cargar los permisos al iniciar sesión
--    y controlar visibilidad de elementos de UI.
-- ============================================================

CREATE OR REPLACE VIEW public.v_user_permissions
WITH (security_invoker = true) AS
SELECT DISTINCT
  t.id                          AS tenant_id,
  t.type                        AS tenant_type,
  tr.key                        AS role_key,
  p.key                         AS permission_key,
  p.module                      AS permission_module
FROM public.profiles            prof
JOIN public.tenant_memberships  tm  ON tm.user_id        = prof.id
JOIN public.tenants             t   ON t.id              = tm.tenant_id
JOIN public.tenant_user_roles   tur ON tur.membership_id = tm.id
JOIN public.tenant_roles        tr  ON tr.id             = tur.tenant_role_id
JOIN public.tenant_role_permissions trp ON trp.tenant_role_id = tr.id
JOIN public.permissions         p   ON p.id              = trp.permission_id
WHERE prof.id       = auth.uid()
  AND tm.status     = 'active'
  AND t.status      = 'active';

-- ============================================================
-- 3. v_producers_admin
--    Panel Admin (gobierno): resumen de productores con
--    conteo de ranchos y estatus de documentos clave.
--    Solo visible para usuarios del tenant government.
-- ============================================================

CREATE OR REPLACE VIEW public.v_producers_admin
WITH (security_invoker = true) AS
SELECT
  pr.id                                         AS producer_id,
  pr.full_name,
  pr.curp,
  pr.status                                     AS producer_status,
  pr.created_at                                 AS registered_at,
  -- Tenant del productor
  t.id                                          AS producer_tenant_id,
  t.slug                                        AS producer_tenant_slug,
  t.status                                      AS producer_tenant_status,
  -- Usuario vinculado
  pr.user_id,
  -- Conteo de ranchos
  COUNT(DISTINCT u.id)                          AS total_upps,
  COUNT(DISTINCT u.id) FILTER (
    WHERE u.status = 'active'
  )                                             AS active_upps,
  COUNT(DISTINCT u.id) FILTER (
    WHERE u.status = 'quarantined'
  )                                             AS quarantined_upps,
  -- Conteo de animales activos en todos sus ranchos
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.status = 'active'
  )                                             AS total_active_animals,
  -- Estatus documental: documentos validados vs pendientes
  COUNT(DISTINCT pd.id) FILTER (
    WHERE pd.status = 'validated' AND pd.is_current = TRUE
  )                                             AS docs_validated,
  COUNT(DISTINCT pd.id) FILTER (
    WHERE pd.status = 'pending' AND pd.is_current = TRUE
  )                                             AS docs_pending,
  COUNT(DISTINCT pd.id) FILTER (
    WHERE pd.status IN ('expired', 'rejected') AND pd.is_current = TRUE
  )                                             AS docs_issues
FROM public.producers           pr
JOIN public.tenants             t   ON t.id          = pr.owner_tenant_id
LEFT JOIN public.upps           u   ON u.producer_id = pr.id
LEFT JOIN public.animals        a   ON a.upp_id      = u.id
LEFT JOIN public.producer_documents pd ON pd.producer_id = pr.id
GROUP BY pr.id, pr.full_name, pr.curp, pr.status, pr.created_at,
         pr.user_id, t.id, t.slug, t.status;

-- ============================================================
-- 4. v_mvz_admin
--    Panel Admin (gobierno): MVZ globales con sus ranchos
--    asignados y conteo de pruebas realizadas.
-- ============================================================

CREATE OR REPLACE VIEW public.v_mvz_admin
WITH (security_invoker = true) AS
SELECT
  mp.id                                         AS mvz_profile_id,
  mp.full_name,
  mp.license_number,
  mp.status                                     AS mvz_status,
  mp.created_at                                 AS registered_at,
  mp.user_id,
  -- Tenant propio del MVZ
  t.id                                          AS mvz_tenant_id,
  t.slug                                        AS mvz_tenant_slug,
  -- Ranchos asignados
  COUNT(DISTINCT mua.upp_id) FILTER (
    WHERE mua.status = 'active'
  )                                             AS active_assignments,
  COUNT(DISTINCT mua.upp_id)                    AS total_assignments,
  -- Pruebas realizadas (últimos 365 días)
  COUNT(DISTINCT ft.id) FILTER (
    WHERE ft.created_at >= NOW() - INTERVAL '365 days'
  )                                             AS tests_last_year,
  COUNT(DISTINCT ft.id) FILTER (
    WHERE ft.created_at >= NOW() - INTERVAL '30 days'
  )                                             AS tests_last_30_days
FROM public.mvz_profiles        mp
JOIN public.tenants             t   ON t.id              = mp.owner_tenant_id
LEFT JOIN public.mvz_upp_assignments mua ON mua.mvz_profile_id = mp.id
LEFT JOIN public.field_tests    ft  ON ft.mvz_profile_id = mp.id
GROUP BY mp.id, mp.full_name, mp.license_number, mp.status,
         mp.created_at, mp.user_id, t.id, t.slug;

-- ============================================================
-- 5. v_producer_dashboard
--    Panel Producer: métricas globales de todos sus ranchos.
--    El productor autenticado solo ve sus propios datos
--    gracias a RLS sobre upps y animals.
-- ============================================================

CREATE OR REPLACE VIEW public.v_producer_dashboard
WITH (security_invoker = true) AS
SELECT
  u.tenant_id,
  u.producer_id,
  -- Métricas de ranchos
  COUNT(DISTINCT u.id)                          AS total_upps,
  COUNT(DISTINCT u.id) FILTER (
    WHERE u.status = 'active'
  )                                             AS active_upps,
  COUNT(DISTINCT u.id) FILTER (
    WHERE u.status = 'quarantined'
  )                                             AS quarantined_upps,
  -- Métricas de animales
  COUNT(DISTINCT a.id)                          AS total_animals,
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.status = 'active'
  )                                             AS active_animals,
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.status = 'in_transit'
  )                                             AS animals_in_transit,
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.status = 'blocked'
  )                                             AS blocked_animals,
  -- Métricas de pruebas sanitarias
  COUNT(DISTINCT ft.id) FILTER (
    WHERE ft.result = 'positive'
  )                                             AS positive_tests_total,
  COUNT(DISTINCT ft.id) FILTER (
    WHERE ft.result = 'positive'
    AND ft.sample_date >= CURRENT_DATE - INTERVAL '90 days'
  )                                             AS positive_tests_90d,
  -- Métricas de exportaciones
  COUNT(DISTINCT er.id) FILTER (
    WHERE er.status = 'requested'
  )                                             AS exports_pending,
  COUNT(DISTINCT er.id) FILTER (
    WHERE er.status = 'final_approved'
    AND er.monthly_bucket >= DATE_TRUNC('month', CURRENT_DATE)
  )                                             AS exports_approved_this_month,
  -- Métricas de movilizaciones
  COUNT(DISTINCT mr.id) FILTER (
    WHERE mr.status = 'requested'
  )                                             AS movements_pending,
  COUNT(DISTINCT mr.id) FILTER (
    WHERE mr.status = 'approved'
    AND mr.movement_date >= CURRENT_DATE - INTERVAL '30 days'
  )                                             AS movements_approved_30d
FROM public.upps                u
LEFT JOIN public.animals        a   ON a.upp_id     = u.id
LEFT JOIN public.field_tests    ft  ON ft.upp_id    = u.id
LEFT JOIN public.export_requests er ON er.upp_id    = u.id
LEFT JOIN public.movement_requests mr ON mr.upp_id  = u.id
GROUP BY u.tenant_id, u.producer_id;

-- ============================================================
-- 6. v_mvz_assignments
--    Panel MVZ: ranchos asignados con estatus sanitario.
--    Muestra última prueba TB y BR por rancho y si está vigente.
-- ============================================================

CREATE OR REPLACE VIEW public.v_mvz_assignments
WITH (security_invoker = true) AS
WITH last_tb AS (
  SELECT DISTINCT ON (ft.upp_id)
    ft.upp_id,
    ft.sample_date  AS tb_last_date,
    ft.result       AS tb_last_result,
    ft.valid_until  AS tb_valid_until,
    CASE
      WHEN ft.valid_until >= CURRENT_DATE THEN 'vigente'
      WHEN ft.valid_until >= CURRENT_DATE - INTERVAL '30 days' THEN 'por_vencer'
      ELSE 'vencida'
    END             AS tb_status
  FROM public.field_tests ft
  JOIN public.test_types  tt ON tt.id = ft.test_type_id
  WHERE tt.key = 'tb'
  ORDER BY ft.upp_id, ft.sample_date DESC
),
last_br AS (
  SELECT DISTINCT ON (ft.upp_id)
    ft.upp_id,
    ft.sample_date  AS br_last_date,
    ft.result       AS br_last_result,
    ft.valid_until  AS br_valid_until,
    CASE
      WHEN ft.valid_until >= CURRENT_DATE THEN 'vigente'
      WHEN ft.valid_until >= CURRENT_DATE - INTERVAL '30 days' THEN 'por_vencer'
      ELSE 'vencida'
    END             AS br_status
  FROM public.field_tests ft
  JOIN public.test_types  tt ON tt.id = ft.test_type_id
  WHERE tt.key = 'br'
  ORDER BY ft.upp_id, ft.sample_date DESC
)
SELECT
  mua.id                                        AS assignment_id,
  mua.mvz_profile_id,
  mua.status                                    AS assignment_status,
  mua.assigned_at,
  -- Datos del rancho
  u.id                                          AS upp_id,
  u.name                                        AS upp_name,
  u.upp_code,
  u.status                                      AS upp_status,
  u.location_lat,
  u.location_lng,
  u.herd_limit,
  -- Productor del rancho
  pr.id                                         AS producer_id,
  pr.full_name                                  AS producer_name,
  -- Conteo de animales activos
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.status = 'active'
  )                                             AS active_animals,
  -- Estatus TB
  tb.tb_last_date,
  tb.tb_last_result,
  tb.tb_valid_until,
  tb.tb_status,
  -- Estatus BR
  br.br_last_date,
  br.br_last_result,
  br.br_valid_until,
  br.br_status,
  -- Alerta general del rancho
  CASE
    WHEN u.status = 'quarantined'                          THEN 'cuarentena'
    WHEN tb.tb_status = 'vencida' OR br.br_status = 'vencida' THEN 'prueba_vencida'
    WHEN tb.tb_last_date IS NULL  OR br.br_last_date IS NULL   THEN 'sin_pruebas'
    WHEN tb.tb_status = 'por_vencer' OR br.br_status = 'por_vencer' THEN 'por_vencer'
    WHEN tb.tb_last_result = 'positive' OR br.br_last_result = 'positive' THEN 'positivo'
    ELSE 'ok'
  END                                           AS sanitary_alert
FROM public.mvz_upp_assignments mua
JOIN public.upps                u   ON u.id          = mua.upp_id
JOIN public.producers           pr  ON pr.id         = u.producer_id
LEFT JOIN public.animals        a   ON a.upp_id      = u.id
LEFT JOIN last_tb               tb  ON tb.upp_id     = u.id
LEFT JOIN last_br               br  ON br.upp_id     = u.id
WHERE mua.status = 'active'
GROUP BY
  mua.id, mua.mvz_profile_id, mua.status, mua.assigned_at,
  u.id, u.name, u.upp_code, u.status, u.location_lat, u.location_lng, u.herd_limit,
  pr.id, pr.full_name,
  tb.tb_last_date, tb.tb_last_result, tb.tb_valid_until, tb.tb_status,
  br.br_last_date, br.br_last_result, br.br_valid_until, br.br_status;

-- ============================================================
-- 7. v_animals_sanitary
--    Vista de animales con su última prueba TB y BR vigente.
--    Útil para panel producer y panel MVZ al ver detalle de rancho.
-- ============================================================

CREATE OR REPLACE VIEW public.v_animals_sanitary
WITH (security_invoker = true) AS
WITH last_tb AS (
  SELECT DISTINCT ON (ft.animal_id)
    ft.animal_id,
    ft.sample_date  AS tb_date,
    ft.result       AS tb_result,
    ft.valid_until  AS tb_valid_until,
    CASE
      WHEN ft.valid_until IS NULL                                    THEN 'sin_prueba'
      WHEN ft.valid_until >= CURRENT_DATE                            THEN 'vigente'
      WHEN ft.valid_until >= CURRENT_DATE - INTERVAL '30 days'      THEN 'por_vencer'
      ELSE 'vencida'
    END             AS tb_status
  FROM public.field_tests ft
  JOIN public.test_types  tt ON tt.id = ft.test_type_id
  WHERE tt.key = 'tb'
  ORDER BY ft.animal_id, ft.sample_date DESC
),
last_br AS (
  SELECT DISTINCT ON (ft.animal_id)
    ft.animal_id,
    ft.sample_date  AS br_date,
    ft.result       AS br_result,
    ft.valid_until  AS br_valid_until,
    CASE
      WHEN ft.valid_until IS NULL                                    THEN 'sin_prueba'
      WHEN ft.valid_until >= CURRENT_DATE                            THEN 'vigente'
      WHEN ft.valid_until >= CURRENT_DATE - INTERVAL '30 days'      THEN 'por_vencer'
      ELSE 'vencida'
    END             AS br_status
  FROM public.field_tests ft
  JOIN public.test_types  tt ON tt.id = ft.test_type_id
  WHERE tt.key = 'br'
  ORDER BY ft.animal_id, ft.sample_date DESC
),
current_collar AS (
  SELECT
    c.animal_id,
    c.id AS current_collar_uuid,
    c.collar_id AS current_collar_id,
    c.status AS current_collar_status,
    c.linked_at AS current_collar_linked_at,
    ROW_NUMBER() OVER (
      PARTITION BY c.animal_id
      ORDER BY COALESCE(c.linked_at, c.created_at) DESC, c.created_at DESC, c.id DESC
    ) AS rn
  FROM public.collars c
  WHERE c.animal_id IS NOT NULL
    AND c.status IN ('linked', 'active')
)
SELECT
  a.id                                          AS animal_id,
  a.upp_id,
  a.tenant_id,
  a.siniiga_tag,
  a.name,
  a.sex,
  a.birth_date,
  a.breed,
  a.weight_kg,
  a.age_years,
  a.health_status,
  a.last_vaccine_at,
  a.status                                      AS animal_status,
  a.mother_animal_id,
  cc.current_collar_uuid,
  cc.current_collar_id,
  cc.current_collar_status,
  cc.current_collar_linked_at,
  -- Rancho
  u.name                                        AS upp_name,
  u.upp_code,
  -- TB
  tb.tb_date,
  tb.tb_result,
  tb.tb_valid_until,
  COALESCE(tb.tb_status, 'sin_prueba')          AS tb_status,
  -- BR
  br.br_date,
  br.br_result,
  br.br_valid_until,
  COALESCE(br.br_status, 'sin_prueba')          AS br_status,
  -- Alerta consolidada del animal
  CASE
    WHEN a.status != 'active'                                             THEN 'inactivo'
    WHEN tb.tb_result = 'positive' OR br.br_result = 'positive'          THEN 'positivo'
    WHEN tb.tb_status = 'vencida'  OR br.br_status = 'vencida'           THEN 'prueba_vencida'
    WHEN tb.tb_status IS NULL      OR br.br_status IS NULL               THEN 'sin_pruebas'
    WHEN tb.tb_status = 'por_vencer' OR br.br_status = 'por_vencer'      THEN 'por_vencer'
    ELSE 'ok'
  END                                           AS sanitary_alert
FROM public.animals             a
JOIN public.upps                u  ON u.id = a.upp_id
LEFT JOIN last_tb               tb ON tb.animal_id = a.id
LEFT JOIN last_br               br ON br.animal_id = a.id
LEFT JOIN current_collar        cc ON cc.animal_id = a.id AND cc.rn = 1;
-- ============================================================
-- 8. v_mvz_dashboard_global
--    Dashboard global MVZ con KPIs agregados de todas sus UPPs.
-- ============================================================

CREATE OR REPLACE VIEW public.v_mvz_dashboard_global
WITH (security_invoker = true) AS
WITH assignments AS (
  SELECT va.mvz_profile_id, va.upp_id, va.sanitary_alert
  FROM public.v_mvz_assignments va
),
upps AS (
  SELECT mvz_profile_id, COUNT(DISTINCT upp_id) AS total_assigned_upps
  FROM assignments
  GROUP BY mvz_profile_id
),
animals AS (
  SELECT a2.mvz_profile_id, COUNT(a.id) AS total_animals_registered
  FROM assignments a2
  JOIN public.animals a ON a.upp_id = a2.upp_id
  GROUP BY a2.mvz_profile_id
),
visits AS (
  SELECT a2.mvz_profile_id,
    COUNT(v.id) FILTER (WHERE v.status IN ('scheduled', 'in_progress')) AS total_active_visits
  FROM assignments a2
  LEFT JOIN public.mvz_visits v ON v.upp_id = a2.upp_id
  GROUP BY a2.mvz_profile_id
),
alerts AS (
  SELECT mvz_profile_id,
    COUNT(*) FILTER (WHERE sanitary_alert IS DISTINCT FROM 'ok') AS active_sanitary_alerts
  FROM assignments
  GROUP BY mvz_profile_id
),
vaccinations AS (
  SELECT a2.mvz_profile_id,
    COUNT(v.id) FILTER (
      WHERE v.status = 'overdue'
        OR v.status = 'pending'
        OR (v.status = 'pending' AND v.due_at IS NOT NULL AND v.due_at < CURRENT_DATE)
    ) AS pending_vaccinations
  FROM assignments a2
  LEFT JOIN public.animal_vaccinations v ON v.upp_id = a2.upp_id
  GROUP BY a2.mvz_profile_id
),
incidents AS (
  SELECT a2.mvz_profile_id,
    COUNT(i.id) FILTER (WHERE i.detected_at >= NOW() - INTERVAL '30 days') AS recent_incidents
  FROM assignments a2
  LEFT JOIN public.sanitary_incidents i ON i.upp_id = a2.upp_id
  GROUP BY a2.mvz_profile_id
)
SELECT
  p.mvz_profile_id,
  COALESCE(u.total_assigned_upps, 0) AS total_assigned_upps,
  COALESCE(an.total_animals_registered, 0) AS total_animals_registered,
  COALESCE(v.total_active_visits, 0) AS total_active_visits,
  COALESCE(al.active_sanitary_alerts, 0) AS active_sanitary_alerts,
  COALESCE(vac.pending_vaccinations, 0) AS pending_vaccinations,
  COALESCE(inc.recent_incidents, 0) AS recent_incidents
FROM (SELECT DISTINCT mvz_profile_id FROM assignments) p
LEFT JOIN upps u ON u.mvz_profile_id = p.mvz_profile_id
LEFT JOIN animals an ON an.mvz_profile_id = p.mvz_profile_id
LEFT JOIN visits v ON v.mvz_profile_id = p.mvz_profile_id
LEFT JOIN alerts al ON al.mvz_profile_id = p.mvz_profile_id
LEFT JOIN vaccinations vac ON vac.mvz_profile_id = p.mvz_profile_id
LEFT JOIN incidents inc ON inc.mvz_profile_id = p.mvz_profile_id;

-- ============================================================
-- 9. v_mvz_ranch_overview
--    Vista de panel contextual por UPP para MVZ.
-- ============================================================

CREATE OR REPLACE VIEW public.v_mvz_ranch_overview
WITH (security_invoker = true) AS
WITH visits_agg AS (
  SELECT
    v.upp_id,
    COUNT(v.id) AS total_visits,
    MAX(COALESCE(v.finished_at, v.started_at, v.scheduled_at)) AS last_visit_at,
    MAX(COALESCE(v.finished_at, v.started_at, v.scheduled_at)) FILTER (WHERE v.status = 'completed') AS last_inspection_at
  FROM public.mvz_visits v
  GROUP BY v.upp_id
),
vaccinations_agg AS (
  SELECT
    v.upp_id,
    COUNT(v.id) FILTER (
      WHERE v.status = 'overdue'
        OR v.status = 'pending'
        OR (v.status = 'pending' AND v.due_at IS NOT NULL AND v.due_at < CURRENT_DATE)
    ) AS pending_vaccinations
  FROM public.animal_vaccinations v
  GROUP BY v.upp_id
),
incidents_agg AS (
  SELECT
    i.upp_id,
    COUNT(i.id) AS incidents_registered,
    COUNT(i.id) FILTER (WHERE i.status IN ('open', 'in_progress')) AS active_incidents,
    COUNT(DISTINCT i.animal_id) FILTER (WHERE i.status IN ('open', 'in_progress')) AS animals_in_treatment
  FROM public.sanitary_incidents i
  GROUP BY i.upp_id
),
animals_agg AS (
  SELECT
    a.upp_id,
    COUNT(a.id) AS total_animals,
    COUNT(a.id) FILTER (WHERE a.status = 'active') AS active_animals
  FROM public.animals a
  GROUP BY a.upp_id
)
SELECT
  va.mvz_profile_id,
  va.assignment_id,
  va.upp_id,
  va.upp_name,
  va.upp_code,
  va.upp_status,
  va.producer_id,
  va.producer_name,
  u.address_text,
  va.location_lat,
  va.location_lng,
  va.sanitary_alert,
  COALESCE(aa.total_animals, 0) AS total_animals,
  COALESCE(aa.active_animals, 0) AS active_animals,
  COALESCE(ia.animals_in_treatment, 0) AS animals_in_treatment,
  COALESCE(va2.pending_vaccinations, 0) AS pending_vaccinations,
  COALESCE(ia.incidents_registered, 0) AS incidents_registered,
  COALESCE(ia.active_incidents, 0) AS active_incidents,
  COALESCE(vi.total_visits, 0) AS total_visits,
  vi.last_visit_at,
  vi.last_inspection_at
FROM public.v_mvz_assignments va
JOIN public.upps u ON u.id = va.upp_id
LEFT JOIN animals_agg aa ON aa.upp_id = va.upp_id
LEFT JOIN incidents_agg ia ON ia.upp_id = va.upp_id
LEFT JOIN vaccinations_agg va2 ON va2.upp_id = va.upp_id
LEFT JOIN visits_agg vi ON vi.upp_id = va.upp_id;

-- ============================================================
-- 10. v_mvz_ranch_reports
--     Resumen operativo por UPP para reportes MVZ.
-- ============================================================

CREATE OR REPLACE VIEW public.v_mvz_ranch_reports
WITH (security_invoker = true) AS
WITH exports_agg AS (
  SELECT
    er.upp_id,
    COUNT(er.id) FILTER (WHERE er.status = 'requested') AS exports_requested,
    COUNT(er.id) FILTER (WHERE er.status = 'mvz_validated') AS exports_validated,
    COUNT(er.id) FILTER (WHERE er.status IN ('blocked', 'rejected')) AS exports_blocked
  FROM public.export_requests er
  WHERE er.upp_id IS NOT NULL
  GROUP BY er.upp_id
),
movements_agg AS (
  SELECT
    mr.upp_id,
    COUNT(mr.id) FILTER (WHERE mr.status = 'requested') AS movements_requested,
    COUNT(mr.id) FILTER (WHERE mr.status = 'approved') AS movements_approved
  FROM public.movement_requests mr
  WHERE mr.upp_id IS NOT NULL
  GROUP BY mr.upp_id
),
field_tests_agg AS (
  SELECT
    ft.upp_id,
    COUNT(ft.id) FILTER (WHERE ft.sample_date >= CURRENT_DATE - INTERVAL '90 days') AS tests_total_90d,
    COUNT(ft.id) FILTER (
      WHERE ft.sample_date >= CURRENT_DATE - INTERVAL '90 days'
        AND ft.result = 'positive'
    ) AS positive_tests_90d
  FROM public.field_tests ft
  GROUP BY ft.upp_id
),
incidents_agg AS (
  SELECT
    si.upp_id,
    COUNT(si.id) FILTER (WHERE si.status IN ('open', 'in_progress')) AS incidents_open,
    COUNT(si.id) FILTER (
      WHERE si.status = 'resolved'
        AND si.resolved_at >= NOW() - INTERVAL '30 days'
    ) AS incidents_resolved_30d
  FROM public.sanitary_incidents si
  GROUP BY si.upp_id
)
SELECT
  va.mvz_profile_id,
  va.upp_id,
  va.upp_name,
  COALESCE(e.exports_requested, 0) AS exports_requested,
  COALESCE(e.exports_validated, 0) AS exports_validated,
  COALESCE(e.exports_blocked, 0) AS exports_blocked,
  COALESCE(m.movements_requested, 0) AS movements_requested,
  COALESCE(m.movements_approved, 0) AS movements_approved,
  COALESCE(t.tests_total_90d, 0) AS tests_total_90d,
  COALESCE(t.positive_tests_90d, 0) AS positive_tests_90d,
  COALESCE(i.incidents_open, 0) AS incidents_open,
  COALESCE(i.incidents_resolved_30d, 0) AS incidents_resolved_30d
FROM public.v_mvz_assignments va
LEFT JOIN exports_agg e ON e.upp_id = va.upp_id
LEFT JOIN movements_agg m ON m.upp_id = va.upp_id
LEFT JOIN field_tests_agg t ON t.upp_id = va.upp_id
LEFT JOIN incidents_agg i ON i.upp_id = va.upp_id;

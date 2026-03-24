-- ============================================================
-- FIX: infinite recursion detected in policy for relation "tenants"
--
-- ROOT CAUSE:
--   The policy "tenants: gobierno gestiona" on public.tenants contains
--   a subquery that JOINs public.tenants again:
--
--     JOIN public.tenants t ON t.id = tm.tenant_id
--     WHERE ... AND t.type = 'government'
--
--   PostgreSQL applies RLS when the subquery accesses tenants, which
--   fires the same policy again → infinite recursion.
--
--   Every other policy on different tables that also does an inline
--   JOIN to public.tenants (producers, upps, animals, etc.) feeds
--   into this same cycle as soon as the tenants RLS policy recurses.
--
-- SOLUTION:
--   Create SECURITY DEFINER helper functions that access public.tenants
--   without triggering RLS, then replace every inline
--   "EXISTS (SELECT 1 FROM tenant_memberships JOIN tenants t ...)"
--   in policy bodies with calls to those helpers.
-- ============================================================

-- ============================================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER → bypass RLS on tenants)
-- ============================================================

-- Is the current auth.uid() a member of any government tenant?
CREATE OR REPLACE FUNCTION public.auth_is_government_member()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = auth.uid()
      AND tm.status  = 'active'
      AND t.type     = 'government'
  );
$$;

-- Is the current auth.uid() a tenant_admin of any government tenant?
CREATE OR REPLACE FUNCTION public.auth_is_government_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    JOIN public.tenant_user_roles   tur ON tur.membership_id  = tm.id
    JOIN public.tenant_roles        tr  ON tr.id              = tur.tenant_role_id
    WHERE tm.user_id = auth.uid()
      AND tm.status  = 'active'
      AND t.type     = 'government'
      AND tr.key     = 'tenant_admin'
  );
$$;

-- ============================================================
-- 2. RECREATE POLICIES — tenants table (the direct recursion)
-- ============================================================

DROP POLICY IF EXISTS "tenants: gobierno gestiona" ON public.tenants;
CREATE POLICY "tenants: gobierno gestiona"
  ON public.tenants FOR ALL
  USING (public.auth_is_government_admin());

-- ============================================================
-- 3. RECREATE POLICIES — producers table
-- ============================================================

DROP POLICY IF EXISTS "producers: gobierno ve todos" ON public.producers;
CREATE POLICY "producers: gobierno ve todos"
  ON public.producers FOR SELECT
  USING (public.auth_is_government_member());

DROP POLICY IF EXISTS "producers: gobierno gestiona" ON public.producers;
CREATE POLICY "producers: gobierno gestiona"
  ON public.producers FOR ALL
  USING (public.auth_is_government_admin());

-- ============================================================
-- 4. RECREATE POLICIES — upps table
-- ============================================================

DROP POLICY IF EXISTS "upps: gobierno ve todas" ON public.upps;
CREATE POLICY "upps: gobierno ve todas"
  ON public.upps FOR SELECT
  USING (public.auth_is_government_member());

-- ============================================================
-- 5. RECREATE POLICIES — mvz_profiles table
-- ============================================================

DROP POLICY IF EXISTS "mvz_profiles: gobierno ve todos" ON public.mvz_profiles;
CREATE POLICY "mvz_profiles: gobierno ve todos"
  ON public.mvz_profiles FOR SELECT
  USING (public.auth_is_government_member());

DROP POLICY IF EXISTS "mvz_profiles: gobierno gestiona" ON public.mvz_profiles;
CREATE POLICY "mvz_profiles: gobierno gestiona"
  ON public.mvz_profiles FOR ALL
  USING (public.auth_is_government_admin());

-- ============================================================
-- 6. RECREATE POLICIES — mvz_upp_assignments table
-- ============================================================

DROP POLICY IF EXISTS "mvz_upp_assignments: gobierno gestiona" ON public.mvz_upp_assignments;
CREATE POLICY "mvz_upp_assignments: gobierno gestiona"
  ON public.mvz_upp_assignments FOR ALL
  USING (public.auth_is_government_admin());

-- ============================================================
-- 7. RECREATE POLICIES — producer_documents table
-- ============================================================

DROP POLICY IF EXISTS "producer_documents: miembro del tenant lee" ON public.producer_documents;
CREATE POLICY "producer_documents: miembro del tenant lee"
  ON public.producer_documents FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_is_government_member()
  );

DROP POLICY IF EXISTS "producer_documents: tenant_admin o gobierno gestiona" ON public.producer_documents;
CREATE POLICY "producer_documents: tenant_admin o gobierno gestiona"
  ON public.producer_documents FOR ALL
  USING (
    public.auth_has_tenant_role(tenant_id, 'tenant_admin')
    OR public.auth_is_government_admin()
  );

-- ============================================================
-- 8. RECREATE POLICIES — animals table
-- ============================================================

DROP POLICY IF EXISTS "animals: miembro del tenant lee" ON public.animals;
CREATE POLICY "animals: miembro del tenant lee"
  ON public.animals FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_is_government_member()
  );

-- ============================================================
-- 9. RECREATE POLICIES — field_tests table
-- ============================================================

DROP POLICY IF EXISTS "field_tests: miembro del tenant o gobierno lee" ON public.field_tests;
CREATE POLICY "field_tests: miembro del tenant o gobierno lee"
  ON public.field_tests FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_is_government_member()
  );

DROP POLICY IF EXISTS "field_tests: gobierno gestiona" ON public.field_tests;
CREATE POLICY "field_tests: gobierno gestiona"
  ON public.field_tests FOR ALL
  USING (public.auth_is_government_admin());

-- ============================================================
-- 10. RECREATE POLICIES — export_requests table
-- ============================================================

DROP POLICY IF EXISTS "export_requests: miembro del tenant o gobierno lee" ON public.export_requests;
CREATE POLICY "export_requests: miembro del tenant o gobierno lee"
  ON public.export_requests FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_is_government_member()
  );

DROP POLICY IF EXISTS "export_requests: mvz con permiso valida (UPDATE)" ON public.export_requests;
CREATE POLICY "export_requests: mvz con permiso valida (UPDATE)"
  ON public.export_requests FOR UPDATE
  USING (
    public.auth_has_tenant_permission(tenant_id, 'mvz.exports.write')
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
    OR public.auth_is_government_admin()
  );

-- ============================================================
-- 11. RECREATE POLICIES — movement_requests table
-- ============================================================

DROP POLICY IF EXISTS "movement_requests: miembro del tenant o gobierno lee" ON public.movement_requests;
CREATE POLICY "movement_requests: miembro del tenant o gobierno lee"
  ON public.movement_requests FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_is_government_member()
  );

DROP POLICY IF EXISTS "movement_requests: gobierno aprueba" ON public.movement_requests;
CREATE POLICY "movement_requests: gobierno aprueba"
  ON public.movement_requests FOR UPDATE
  USING (public.auth_is_government_admin());

-- ============================================================
-- 12. RECREATE POLICIES — normative_settings table
-- ============================================================

DROP POLICY IF EXISTS "normative_settings: gobierno gestiona" ON public.normative_settings;
CREATE POLICY "normative_settings: gobierno gestiona"
  ON public.normative_settings FOR ALL
  USING (public.auth_is_government_admin());

-- ============================================================
-- 13. RECREATE POLICIES — appointment_requests table
-- ============================================================

DROP POLICY IF EXISTS "appointment_requests: gobierno lee y gestiona" ON public.appointment_requests;
CREATE POLICY "appointment_requests: gobierno lee y gestiona"
  ON public.appointment_requests FOR ALL
  USING (public.auth_is_government_member());

-- ============================================================
-- 14. RECREATE POLICIES — notification_events table
-- ============================================================

DROP POLICY IF EXISTS "notification_events: gobierno crea notificaciones" ON public.notification_events;
CREATE POLICY "notification_events: gobierno crea notificaciones"
  ON public.notification_events FOR INSERT
  WITH CHECK (public.auth_is_government_member());

-- ============================================================
-- 15. RECREATE POLICIES — migration_002 tables
--     (mvz_visits, animal_vaccinations, sanitary_incidents, upp_documents)
-- ============================================================

DROP POLICY IF EXISTS "mvz_visits: member_or_assigned_or_government_read" ON public.mvz_visits;
CREATE POLICY "mvz_visits: member_or_assigned_or_government_read"
  ON public.mvz_visits FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_is_government_member()
  );

DROP POLICY IF EXISTS "animal_vaccinations: member_or_assigned_or_government_read" ON public.animal_vaccinations;
CREATE POLICY "animal_vaccinations: member_or_assigned_or_government_read"
  ON public.animal_vaccinations FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_is_government_member()
  );

DROP POLICY IF EXISTS "sanitary_incidents: member_or_assigned_or_government_read" ON public.sanitary_incidents;
CREATE POLICY "sanitary_incidents: member_or_assigned_or_government_read"
  ON public.sanitary_incidents FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_is_government_member()
  );

DROP POLICY IF EXISTS "upp_documents: member_or_assigned_or_government_read" ON public.upp_documents;
CREATE POLICY "upp_documents: member_or_assigned_or_government_read"
  ON public.upp_documents FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_is_government_member()
  );

-- ============================================================
-- 16. RECREATE POLICIES - audit_logs table
--     (missing in the first draft; still had direct JOIN tenants)
-- ============================================================

DROP POLICY IF EXISTS "audit_logs: gobierno lee" ON public.audit_logs;
CREATE POLICY "audit_logs: gobierno lee"
  ON public.audit_logs FOR SELECT
  USING (
    tenant_id IS NOT NULL
    AND public.auth_is_government_admin()
  );

-- ============================================================
-- 17. POST-APPLY CHECKS
-- ============================================================

-- A) Confirm helper functions exist and are SECURITY DEFINER
SELECT
  proname,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname IN ('auth_is_government_member', 'auth_is_government_admin')
ORDER BY proname;

-- B) Confirm no policy body still references public.tenants directly
SELECT
  c.relname AS table_name,
  p.polname,
  pg_get_expr(p.polqual, p.polrelid) AS using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ILIKE '%public.tenants%'
   OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ILIKE '%public.tenants%'
ORDER BY c.relname, p.polname;

-- Expected result for B:
--   zero rows from policies.
--
-- Note:
--   public.auth_get_panel_type() still JOINs public.tenants in the base migration,
--   but that function is already SECURITY DEFINER and is not itself a policy body.

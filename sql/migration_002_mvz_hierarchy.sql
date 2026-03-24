-- ============================================================
-- DURANIA MVP PRO - Migration 002 (MVZ Hierarchy)
-- Jerarquia MVZ Gobierno -> Rancho (UPP)
-- ============================================================

-- ============================================================
-- 1. PERMISOS MVZ GRANULARES POR RANCHO
-- ============================================================

INSERT INTO public.permissions (key, description, module)
VALUES
  ('mvz.ranch.read', 'Ver panel por rancho asignado', 'mvz'),
  ('mvz.ranch.animals.read', 'Ver animales del rancho asignado', 'mvz'),
  ('mvz.ranch.clinical.read', 'Ver historial clinico del rancho asignado', 'mvz'),
  ('mvz.ranch.vaccinations.read', 'Ver vacunacion del rancho asignado', 'mvz'),
  ('mvz.ranch.vaccinations.write', 'Gestionar vacunacion del rancho asignado', 'mvz'),
  ('mvz.ranch.incidents.read', 'Ver incidencias del rancho asignado', 'mvz'),
  ('mvz.ranch.incidents.write', 'Gestionar incidencias del rancho asignado', 'mvz'),
  ('mvz.ranch.reports.read', 'Ver reportes del rancho asignado', 'mvz'),
  ('mvz.ranch.documents.read', 'Ver documentacion del rancho asignado', 'mvz'),
  ('mvz.ranch.documents.write', 'Gestionar documentacion del rancho asignado', 'mvz'),
  ('mvz.ranch.visits.read', 'Ver visitas del rancho asignado', 'mvz'),
  ('mvz.ranch.visits.write', 'Gestionar visitas del rancho asignado', 'mvz')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. TABLAS MVZ POR RANCHO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mvz_visits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  upp_id                UUID NOT NULL REFERENCES public.upps(id) ON DELETE CASCADE,
  mvz_profile_id        UUID NOT NULL REFERENCES public.mvz_profiles(id) ON DELETE RESTRICT,
  visit_type            TEXT NOT NULL DEFAULT 'inspection',
  status                TEXT NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_at          TIMESTAMPTZ NOT NULL,
  started_at            TIMESTAMPTZ,
  finished_at           TIMESTAMPTZ,
  notes                 TEXT,
  created_by_user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.animal_vaccinations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  upp_id                UUID NOT NULL REFERENCES public.upps(id) ON DELETE CASCADE,
  animal_id             UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  vaccine_name          TEXT NOT NULL,
  dose                  TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'applied', 'overdue', 'cancelled')),
  applied_at            DATE,
  due_at                DATE,
  applied_by_mvz_profile_id UUID REFERENCES public.mvz_profiles(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sanitary_incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  upp_id                UUID NOT NULL REFERENCES public.upps(id) ON DELETE CASCADE,
  animal_id             UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  incident_type         TEXT NOT NULL,
  severity              TEXT NOT NULL DEFAULT 'medium'
                          CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status                TEXT NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  description           TEXT,
  resolution_notes      TEXT,
  reported_by_mvz_profile_id UUID REFERENCES public.mvz_profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.upp_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  upp_id                UUID NOT NULL REFERENCES public.upps(id) ON DELETE CASCADE,
  document_type         TEXT NOT NULL,
  file_storage_key      TEXT NOT NULL,
  file_hash             TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'validated', 'expired', 'rejected')),
  issued_at             DATE,
  expiry_date           DATE,
  uploaded_by_user_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_current            BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS upp_documents_current_unique
  ON public.upp_documents (upp_id, document_type)
  WHERE is_current = TRUE;

-- ============================================================
-- 3. INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_mvz_visits_upp_status
  ON public.mvz_visits(upp_id, status);

CREATE INDEX IF NOT EXISTS idx_mvz_visits_profile_date
  ON public.mvz_visits(mvz_profile_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_animal_vaccinations_upp_status
  ON public.animal_vaccinations(upp_id, status);

CREATE INDEX IF NOT EXISTS idx_animal_vaccinations_animal
  ON public.animal_vaccinations(animal_id);

CREATE INDEX IF NOT EXISTS idx_animal_vaccinations_due
  ON public.animal_vaccinations(due_at);

CREATE INDEX IF NOT EXISTS idx_sanitary_incidents_upp_status
  ON public.sanitary_incidents(upp_id, status);

CREATE INDEX IF NOT EXISTS idx_sanitary_incidents_animal
  ON public.sanitary_incidents(animal_id);

CREATE INDEX IF NOT EXISTS idx_sanitary_incidents_detected
  ON public.sanitary_incidents(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_upp_documents_upp_status
  ON public.upp_documents(upp_id, status);

-- ============================================================
-- 4. RLS TABLAS NUEVAS
-- ============================================================

ALTER TABLE public.mvz_visits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanitary_incidents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upp_documents       ENABLE ROW LEVEL SECURITY;

-- Lectura: miembros del tenant productor, MVZ asignado o gobierno.
CREATE POLICY "mvz_visits: member_or_assigned_or_government_read"
  ON public.mvz_visits FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND t.type = 'government'
    )
  );

CREATE POLICY "mvz_visits: assigned_or_admin_write"
  ON public.mvz_visits FOR ALL
  USING (
    public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  )
  WITH CHECK (
    public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  );

CREATE POLICY "animal_vaccinations: member_or_assigned_or_government_read"
  ON public.animal_vaccinations FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND t.type = 'government'
    )
  );

CREATE POLICY "animal_vaccinations: assigned_or_admin_write"
  ON public.animal_vaccinations FOR ALL
  USING (
    public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  )
  WITH CHECK (
    public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  );

CREATE POLICY "sanitary_incidents: member_or_assigned_or_government_read"
  ON public.sanitary_incidents FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND t.type = 'government'
    )
  );

CREATE POLICY "sanitary_incidents: assigned_or_admin_write"
  ON public.sanitary_incidents FOR ALL
  USING (
    public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  )
  WITH CHECK (
    public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  );

CREATE POLICY "upp_documents: member_or_assigned_or_government_read"
  ON public.upp_documents FOR SELECT
  USING (
    public.auth_in_tenant(tenant_id)
    OR public.auth_mvz_assigned_to_upp(upp_id)
    OR EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND t.type = 'government'
    )
  );

CREATE POLICY "upp_documents: assigned_or_admin_write"
  ON public.upp_documents FOR ALL
  USING (
    public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  )
  WITH CHECK (
    public.auth_mvz_assigned_to_upp(upp_id)
    OR public.auth_has_tenant_role(tenant_id, 'tenant_admin')
  );

-- ============================================================
-- 5. REALTIME PUBLICATION
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'mvz_visits'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.mvz_visits';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'animal_vaccinations'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.animal_vaccinations';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'sanitary_incidents'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sanitary_incidents';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'upp_documents'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.upp_documents';
    END IF;
  END IF;
END;
$$;

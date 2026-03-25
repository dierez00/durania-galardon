-- ============================================================
-- DURANIA MVP PRO - Migration 010
-- Backfill de perfil animal y vinculo canonico de collares
-- ============================================================

ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS breed TEXT,
  ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS age_years INTEGER,
  ADD COLUMN IF NOT EXISTS health_status TEXT,
  ADD COLUMN IF NOT EXISTS last_vaccine_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'animals_weight_kg_nonnegative_chk'
      AND conrelid = 'public.animals'::regclass
  ) THEN
    ALTER TABLE public.animals
      ADD CONSTRAINT animals_weight_kg_nonnegative_chk
      CHECK (weight_kg IS NULL OR weight_kg >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'animals_age_years_nonnegative_chk'
      AND conrelid = 'public.animals'::regclass
  ) THEN
    ALTER TABLE public.animals
      ADD CONSTRAINT animals_age_years_nonnegative_chk
      CHECK (age_years IS NULL OR age_years >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'animals_health_status_chk'
      AND conrelid = 'public.animals'::regclass
  ) THEN
    ALTER TABLE public.animals
      ADD CONSTRAINT animals_health_status_chk
      CHECK (
        health_status IS NULL
        OR health_status IN ('healthy', 'observation', 'quarantine')
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_ear_tag(p_tag TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT NULLIF(
    regexp_replace(upper(trim(p_tag)), '[^A-Z0-9]+', '', 'g'),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_import_token(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT NULLIF(
    regexp_replace(upper(trim(p_value)), '[^A-Z0-9]+', '', 'g'),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.map_import_animal_sex(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT CASE public.normalize_import_token(p_value)
    WHEN 'M' THEN 'M'
    WHEN 'MACHO' THEN 'M'
    WHEN 'MALE' THEN 'M'
    WHEN 'F' THEN 'F'
    WHEN 'HEMBRA' THEN 'F'
    WHEN 'FEMALE' THEN 'F'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.map_import_animal_health_status(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT CASE public.normalize_import_token(p_value)
    WHEN 'SANO' THEN 'healthy'
    WHEN 'HEALTHY' THEN 'healthy'
    WHEN 'OBSERVACION' THEN 'observation'
    WHEN 'OBSERVACIN' THEN 'observation'
    WHEN 'OBSERVATION' THEN 'observation'
    WHEN 'CUARENTENA' THEN 'quarantine'
    WHEN 'QUARANTINE' THEN 'quarantine'
    ELSE NULL
  END;
$$;

CREATE TABLE IF NOT EXISTS public.stg_animals_backfill (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ear_tag         TEXT NOT NULL,
  name            TEXT,
  age_years       INTEGER,
  breed           TEXT,
  sex             TEXT,
  weight_kg       DOUBLE PRECISION,
  health_status   TEXT,
  last_vaccine_at TIMESTAMPTZ,
  source_row_ref  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stg_animals_backfill_age_years_nonnegative_chk
    CHECK (age_years IS NULL OR age_years >= 0),
  CONSTRAINT stg_animals_backfill_weight_kg_nonnegative_chk
    CHECK (weight_kg IS NULL OR weight_kg >= 0)
);

CREATE TABLE IF NOT EXISTS public.stg_collar_links_backfill (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ear_tag        TEXT NOT NULL,
  collar_id      TEXT NOT NULL,
  linked_at      TIMESTAMPTZ,
  notes          TEXT,
  source_row_ref TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stg_animals_backfill_ear_tag_normalized
  ON public.stg_animals_backfill (public.normalize_ear_tag(ear_tag));

CREATE INDEX IF NOT EXISTS idx_stg_collar_links_backfill_ear_tag_normalized
  ON public.stg_collar_links_backfill (public.normalize_ear_tag(ear_tag));

CREATE INDEX IF NOT EXISTS idx_stg_collar_links_backfill_collar_id_normalized
  ON public.stg_collar_links_backfill ((upper(btrim(collar_id))));

CREATE UNIQUE INDEX IF NOT EXISTS idx_collars_one_active_per_animal
  ON public.collars (animal_id)
  WHERE animal_id IS NOT NULL
    AND status IN ('linked', 'active');

CREATE UNIQUE INDEX IF NOT EXISTS idx_cah_one_open_per_collar
  ON public.collar_animal_history (collar_id_fk)
  WHERE unlinked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cah_one_open_per_animal
  ON public.collar_animal_history (animal_id)
  WHERE unlinked_at IS NULL;

CREATE OR REPLACE FUNCTION public.promote_animals_backfill_and_collar_links(
  p_default_linked_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  updated_animals INTEGER,
  linked_collars INTEGER,
  closed_history_rows INTEGER,
  inserted_history_rows INTEGER
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_details TEXT;
BEGIN
  SELECT string_agg(COALESCE(source_row_ref, ear_tag, id::TEXT), ', ' ORDER BY created_at, id)
  INTO v_details
  FROM public.stg_animals_backfill
  WHERE public.normalize_ear_tag(ear_tag) IS NULL;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_animals_backfill contiene ear_tag vacio o invalido: %', v_details;
  END IF;

  SELECT string_agg(tag, ', ' ORDER BY tag)
  INTO v_details
  FROM (
    SELECT public.normalize_ear_tag(ear_tag) AS tag
    FROM public.stg_animals_backfill
    GROUP BY 1
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_animals_backfill contiene ear_tag duplicado tras normalizacion: %', v_details;
  END IF;

  SELECT string_agg(COALESCE(source_row_ref, ear_tag, id::TEXT), ', ' ORDER BY created_at, id)
  INTO v_details
  FROM public.stg_animals_backfill
  WHERE NULLIF(btrim(sex), '') IS NOT NULL
    AND public.map_import_animal_sex(sex) IS NULL;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_animals_backfill contiene sex invalido; use Macho/Hembra o M/F: %', v_details;
  END IF;

  SELECT string_agg(COALESCE(source_row_ref, ear_tag, id::TEXT), ', ' ORDER BY created_at, id)
  INTO v_details
  FROM public.stg_animals_backfill
  WHERE NULLIF(btrim(health_status), '') IS NOT NULL
    AND public.map_import_animal_health_status(health_status) IS NULL;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_animals_backfill contiene health_status invalido; use Sano/Observacion/Cuarentena: %', v_details;
  END IF;

  SELECT string_agg(match_ref, ', ' ORDER BY match_ref)
  INTO v_details
  FROM (
    SELECT
      COALESCE(s.source_row_ref, s.ear_tag, s.id::TEXT) AS match_ref
    FROM public.stg_animals_backfill s
    LEFT JOIN public.animals a
      ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
    GROUP BY s.id, COALESCE(s.source_row_ref, s.ear_tag, s.id::TEXT)
    HAVING COUNT(a.id) <> 1
  ) unmatched_animals;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_animals_backfill contiene ear_tag que no resuelve exactamente un animal: %', v_details;
  END IF;

  SELECT string_agg(conflict_ref, ', ' ORDER BY conflict_ref)
  INTO v_details
  FROM (
    SELECT COALESCE(s.source_row_ref, s.ear_tag, s.id::TEXT) AS conflict_ref
    FROM public.stg_animals_backfill s
    JOIN public.animals a
      ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
    WHERE public.map_import_animal_sex(s.sex) IS NOT NULL
      AND a.sex IS DISTINCT FROM public.map_import_animal_sex(s.sex)
  ) sex_conflicts;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'Se detectaron conflictos de sexo entre staging y animals: %', v_details;
  END IF;

  SELECT string_agg(conflict_ref, ', ' ORDER BY conflict_ref)
  INTO v_details
  FROM (
    SELECT COALESCE(s.source_row_ref, s.ear_tag, s.id::TEXT) AS conflict_ref
    FROM public.stg_animals_backfill s
    JOIN public.animals a
      ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
    WHERE NULLIF(btrim(s.name), '') IS NOT NULL
      AND NULLIF(btrim(a.name), '') IS NOT NULL
      AND NULLIF(btrim(s.name), '') IS DISTINCT FROM NULLIF(btrim(a.name), '')
  ) name_conflicts;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'Se detectaron conflictos de name entre staging y animals: %', v_details;
  END IF;

  SELECT string_agg(COALESCE(source_row_ref, collar_id, id::TEXT), ', ' ORDER BY created_at, id)
  INTO v_details
  FROM public.stg_collar_links_backfill
  WHERE public.normalize_ear_tag(ear_tag) IS NULL;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_collar_links_backfill contiene ear_tag vacio o invalido: %', v_details;
  END IF;

  SELECT string_agg(COALESCE(source_row_ref, collar_id, id::TEXT), ', ' ORDER BY created_at, id)
  INTO v_details
  FROM public.stg_collar_links_backfill
  WHERE NULLIF(upper(btrim(collar_id)), '') IS NULL;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_collar_links_backfill contiene collar_id vacio o invalido: %', v_details;
  END IF;

  SELECT string_agg(collar_key, ', ' ORDER BY collar_key)
  INTO v_details
  FROM (
    SELECT upper(btrim(collar_id)) AS collar_key
    FROM public.stg_collar_links_backfill
    GROUP BY 1
    HAVING COUNT(*) > 1
  ) duplicate_collars;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_collar_links_backfill contiene collar_id duplicado: %', v_details;
  END IF;

  SELECT string_agg(match_ref, ', ' ORDER BY match_ref)
  INTO v_details
  FROM (
    SELECT COALESCE(s.source_row_ref, s.collar_id, s.id::TEXT) AS match_ref
    FROM public.stg_collar_links_backfill s
    LEFT JOIN public.animals a
      ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
    GROUP BY s.id, COALESCE(s.source_row_ref, s.collar_id, s.id::TEXT)
    HAVING COUNT(a.id) <> 1
  ) unmatched_link_animals;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_collar_links_backfill contiene ear_tag que no resuelve exactamente un animal: %', v_details;
  END IF;

  SELECT string_agg(match_ref, ', ' ORDER BY match_ref)
  INTO v_details
  FROM (
    SELECT COALESCE(s.source_row_ref, s.collar_id, s.id::TEXT) AS match_ref
    FROM public.stg_collar_links_backfill s
    LEFT JOIN public.collars c
      ON upper(btrim(c.collar_id)) = upper(btrim(s.collar_id))
    GROUP BY s.id, COALESCE(s.source_row_ref, s.collar_id, s.id::TEXT)
    HAVING COUNT(c.id) <> 1
  ) unmatched_collars;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'stg_collar_links_backfill contiene collar_id que no resuelve exactamente un collar: %', v_details;
  END IF;

  SELECT string_agg(conflict_ref, ', ' ORDER BY conflict_ref)
  INTO v_details
  FROM (
    WITH resolved_links AS (
      SELECT
        COALESCE(s.source_row_ref, s.collar_id, s.id::TEXT) AS conflict_ref,
        a.id AS animal_id
      FROM public.stg_collar_links_backfill s
      JOIN public.collars c
        ON upper(btrim(c.collar_id)) = upper(btrim(s.collar_id))
      JOIN public.animals a
        ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
    ),
    duplicate_animals AS (
      SELECT animal_id
      FROM resolved_links
      GROUP BY animal_id
      HAVING COUNT(*) > 1
    )
    SELECT rl.conflict_ref
    FROM resolved_links rl
    JOIN duplicate_animals da ON da.animal_id = rl.animal_id
  ) animal_duplicate_targets;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'La carga intentaria vincular mas de un collar al mismo animal: %', v_details;
  END IF;

  SELECT string_agg(conflict_ref, ', ' ORDER BY conflict_ref)
  INTO v_details
  FROM (
    WITH resolved_links AS (
      SELECT
        COALESCE(s.source_row_ref, s.collar_id, s.id::TEXT) AS conflict_ref,
        c.id AS collar_uuid,
        c.animal_id AS current_animal_id,
        c.status AS current_status,
        a.id AS target_animal_id
      FROM public.stg_collar_links_backfill s
      JOIN public.collars c
        ON upper(btrim(c.collar_id)) = upper(btrim(s.collar_id))
      JOIN public.animals a
        ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
    )
    SELECT conflict_ref
    FROM resolved_links
    WHERE current_animal_id IS NOT NULL
      AND current_animal_id <> target_animal_id
      AND current_status IN ('linked', 'active')
  ) collar_conflicts;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'Existen collares activos ligados a otro animal distinto: %', v_details;
  END IF;

  SELECT string_agg(conflict_ref, ', ' ORDER BY conflict_ref)
  INTO v_details
  FROM (
    WITH resolved_links AS (
      SELECT
        COALESCE(s.source_row_ref, s.collar_id, s.id::TEXT) AS conflict_ref,
        c.id AS collar_uuid,
        a.id AS target_animal_id
      FROM public.stg_collar_links_backfill s
      JOIN public.collars c
        ON upper(btrim(c.collar_id)) = upper(btrim(s.collar_id))
      JOIN public.animals a
        ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
    )
    SELECT rl.conflict_ref
    FROM resolved_links rl
    JOIN public.collars c
      ON c.animal_id = rl.target_animal_id
     AND c.id <> rl.collar_uuid
     AND c.status IN ('linked', 'active')
  ) active_animal_conflicts;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'Existen animales con otro collar activo distinto al solicitado: %', v_details;
  END IF;

  WITH resolved_animals AS (
    SELECT
      a.id AS animal_id,
      NULLIF(btrim(s.name), '') AS next_name,
      NULLIF(btrim(s.breed), '') AS next_breed,
      s.weight_kg AS next_weight_kg,
      s.age_years AS next_age_years,
      public.map_import_animal_health_status(s.health_status) AS next_health_status,
      s.last_vaccine_at AS next_last_vaccine_at
    FROM public.stg_animals_backfill s
    JOIN public.animals a
      ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
  )
  UPDATE public.animals a
  SET
    name = COALESCE(r.next_name, a.name),
    breed = COALESCE(r.next_breed, a.breed),
    weight_kg = COALESCE(r.next_weight_kg, a.weight_kg),
    age_years = COALESCE(r.next_age_years, a.age_years),
    health_status = COALESCE(r.next_health_status, a.health_status),
    last_vaccine_at = COALESCE(r.next_last_vaccine_at, a.last_vaccine_at)
  FROM resolved_animals r
  WHERE a.id = r.animal_id
    AND (
      a.name IS DISTINCT FROM COALESCE(r.next_name, a.name)
      OR a.breed IS DISTINCT FROM COALESCE(r.next_breed, a.breed)
      OR a.weight_kg IS DISTINCT FROM COALESCE(r.next_weight_kg, a.weight_kg)
      OR a.age_years IS DISTINCT FROM COALESCE(r.next_age_years, a.age_years)
      OR a.health_status IS DISTINCT FROM COALESCE(r.next_health_status, a.health_status)
      OR a.last_vaccine_at IS DISTINCT FROM COALESCE(r.next_last_vaccine_at, a.last_vaccine_at)
    );

  GET DIAGNOSTICS updated_animals = ROW_COUNT;

  WITH resolved_links AS (
    SELECT
      c.id AS collar_uuid,
      a.id AS animal_id,
      a.tenant_id,
      COALESCE(s.linked_at, c.linked_at, p_default_linked_at) AS effective_linked_at,
      s.notes
    FROM public.stg_collar_links_backfill s
    JOIN public.collars c
      ON upper(btrim(c.collar_id)) = upper(btrim(s.collar_id))
    JOIN public.animals a
      ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
  )
  UPDATE public.collar_animal_history h
  SET
    unlinked_at = r.effective_linked_at
  FROM resolved_links r
  WHERE h.collar_id_fk = r.collar_uuid
    AND h.unlinked_at IS NULL
    AND h.animal_id <> r.animal_id;

  GET DIAGNOSTICS closed_history_rows = ROW_COUNT;

  WITH resolved_links AS (
    SELECT
      c.id AS collar_uuid,
      a.id AS animal_id,
      a.tenant_id,
      COALESCE(s.linked_at, c.linked_at, p_default_linked_at) AS effective_linked_at
    FROM public.stg_collar_links_backfill s
    JOIN public.collars c
      ON upper(btrim(c.collar_id)) = upper(btrim(s.collar_id))
    JOIN public.animals a
      ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
  )
  UPDATE public.collars c
  SET
    tenant_id = r.tenant_id,
    animal_id = r.animal_id,
    status = 'linked',
    linked_at = r.effective_linked_at,
    unlinked_at = NULL
  FROM resolved_links r
  WHERE c.id = r.collar_uuid
    AND (
      c.tenant_id IS DISTINCT FROM r.tenant_id
      OR c.animal_id IS DISTINCT FROM r.animal_id
      OR c.status IS DISTINCT FROM 'linked'
      OR c.linked_at IS DISTINCT FROM r.effective_linked_at
      OR c.unlinked_at IS NOT NULL
    );

  GET DIAGNOSTICS linked_collars = ROW_COUNT;

  WITH resolved_links AS (
    SELECT
      c.id AS collar_uuid,
      a.id AS animal_id,
      a.tenant_id,
      COALESCE(s.linked_at, c.linked_at, p_default_linked_at) AS effective_linked_at,
      s.notes
    FROM public.stg_collar_links_backfill s
    JOIN public.collars c
      ON upper(btrim(c.collar_id)) = upper(btrim(s.collar_id))
    JOIN public.animals a
      ON public.normalize_ear_tag(a.siniiga_tag) = public.normalize_ear_tag(s.ear_tag)
  )
  INSERT INTO public.collar_animal_history (
    collar_id_fk,
    animal_id,
    tenant_id,
    linked_at,
    notes
  )
  SELECT
    r.collar_uuid,
    r.animal_id,
    r.tenant_id,
    r.effective_linked_at,
    r.notes
  FROM resolved_links r
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.collar_animal_history h
    WHERE h.collar_id_fk = r.collar_uuid
      AND h.animal_id = r.animal_id
      AND h.unlinked_at IS NULL
  );

  GET DIAGNOSTICS inserted_history_rows = ROW_COUNT;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE VIEW public.v_animals_sanitary
WITH (security_invoker = true) AS
WITH last_tb AS (
  SELECT DISTINCT ON (ft.animal_id)
    ft.animal_id,
    ft.sample_date AS tb_date,
    ft.result AS tb_result,
    ft.valid_until AS tb_valid_until,
    CASE
      WHEN ft.valid_until IS NULL THEN 'sin_prueba'
      WHEN ft.valid_until >= CURRENT_DATE THEN 'vigente'
      WHEN ft.valid_until >= CURRENT_DATE - INTERVAL '30 days' THEN 'por_vencer'
      ELSE 'vencida'
    END AS tb_status
  FROM public.field_tests ft
  JOIN public.test_types tt ON tt.id = ft.test_type_id
  WHERE tt.key = 'tb'
  ORDER BY ft.animal_id, ft.sample_date DESC
),
last_br AS (
  SELECT DISTINCT ON (ft.animal_id)
    ft.animal_id,
    ft.sample_date AS br_date,
    ft.result AS br_result,
    ft.valid_until AS br_valid_until,
    CASE
      WHEN ft.valid_until IS NULL THEN 'sin_prueba'
      WHEN ft.valid_until >= CURRENT_DATE THEN 'vigente'
      WHEN ft.valid_until >= CURRENT_DATE - INTERVAL '30 days' THEN 'por_vencer'
      ELSE 'vencida'
    END AS br_status
  FROM public.field_tests ft
  JOIN public.test_types tt ON tt.id = ft.test_type_id
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
  a.id AS animal_id,
  a.upp_id,
  a.tenant_id,
  a.siniiga_tag,
  a.sex,
  a.birth_date,
  a.status AS animal_status,
  a.mother_animal_id,
  u.name AS upp_name,
  u.upp_code,
  tb.tb_date,
  tb.tb_result,
  tb.tb_valid_until,
  COALESCE(tb.tb_status, 'sin_prueba') AS tb_status,
  br.br_date,
  br.br_result,
  br.br_valid_until,
  COALESCE(br.br_status, 'sin_prueba') AS br_status,
  CASE
    WHEN a.status != 'active' THEN 'inactivo'
    WHEN tb.tb_result = 'positive' OR br.br_result = 'positive' THEN 'positivo'
    WHEN tb.tb_status = 'vencida' OR br.br_status = 'vencida' THEN 'prueba_vencida'
    WHEN tb.tb_status IS NULL OR br.br_status IS NULL THEN 'sin_pruebas'
    WHEN tb.tb_status = 'por_vencer' OR br.br_status = 'por_vencer' THEN 'por_vencer'
    ELSE 'ok'
  END AS sanitary_alert,
  a.name,
  a.breed,
  a.weight_kg,
  a.age_years,
  a.health_status,
  a.last_vaccine_at,
  cc.current_collar_uuid,
  cc.current_collar_id,
  cc.current_collar_status,
  cc.current_collar_linked_at
FROM public.animals a
JOIN public.upps u ON u.id = a.upp_id
LEFT JOIN last_tb tb ON tb.animal_id = a.id
LEFT JOIN last_br br ON br.animal_id = a.id
LEFT JOIN current_collar cc ON cc.animal_id = a.id AND cc.rn = 1;

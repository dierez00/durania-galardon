-- ============================================================
-- SEED: Datos de prueba — Bovinos del Productor
-- ============================================================
-- tenant:   bc430399-22c4-466c-a368-5cdf20964907
-- user:     9c4021c3-35f7-4c7c-ac73-fe40b5489f16
-- UPPs (se crearán si no existen):
--   330b4da0-3129-447e-bbf8-0dbb7b9b1a1d  (Rancho La Esperanza)
--   6c8dff0d-dc8c-4436-8e53-cabceb632132  (Rancho El Sauz)
--   7ea62995-b13b-4ca5-ad15-e0f5b6a208d8  (Rancho Los Pinos)
-- ============================================================
-- Status sanitario esperado por animal:
--   Anim 01 → TB vigente neg  + BR vigente neg  → EXPORTABLE ✅
--   Anim 02 → TB vigente neg  + BR vigente neg  → EXPORTABLE ✅
--   Anim 03 → TB positive     + BR vigente neg  → NO (positivo) ❌
--   Anim 04 → TB vencida neg  + BR vigente neg  → NO (prueba_vencida) ❌
--   Anim 05 → TB vigente neg  + BR por_vencer neg → NO (por_vencer) ❌
--   Anim 06 → Sin pruebas                       → NO (sin_pruebas) ❌
--   Anim 07 → TB vigente neg  + BR vigente neg  → EXPORTABLE ✅
--   Anim 08 → BLOCKED + pruebas vigentes         → NO (inactivo) ❌
--   Anim 09 → Sin TB + BR vigente neg           → NO (sin_prueba TB) ❌
--   Anim 10 → TB vigente neg  + BR vigente neg  → EXPORTABLE ✅
-- ============================================================

DO $$
DECLARE
  v_tenant_id  UUID := 'bc430399-22c4-466c-a368-5cdf20964907';
  v_user_id    UUID := '9c4021c3-35f7-4c7c-ac73-fe40b5489f16';
  v_producer_id UUID;

  v_upp1 UUID := '330b4da0-3129-447e-bbf8-0dbb7b9b1a1d';
  v_upp2 UUID := '6c8dff0d-dc8c-4436-8e53-cabceb632132';
  v_upp3 UUID := '7ea62995-b13b-4ca5-ad15-e0f5b6a208d8';

  v_mvz_profile_id UUID;
  v_tt_tb UUID;
  v_tt_br UUID;

BEGIN

-- ============================================================
-- 0. VERIFICAR / RESOLVER DEPENDENCIAS GLOBALES
-- ============================================================
-- test_types (idempotente)
INSERT INTO public.test_types (key, name, validity_days)
VALUES ('tb', 'Tuberculosis', 365), ('br', 'Brucelosis', 365)
ON CONFLICT (key) DO NOTHING;

SELECT id INTO v_tt_tb FROM public.test_types WHERE key = 'tb';
SELECT id INTO v_tt_br FROM public.test_types WHERE key = 'br';

-- mvz_profile: usar el existente o crear uno mínimo de placeholder
SELECT id INTO v_mvz_profile_id FROM public.mvz_profiles LIMIT 1;

IF v_mvz_profile_id IS NULL THEN
  RAISE EXCEPTION 'No existe ningún mvz_profile en la BD. Ejecuta primero el SeedActual.sql';
END IF;

RAISE NOTICE 'mvz_profile_id = %, tt_tb = %, tt_br = %', v_mvz_profile_id, v_tt_tb, v_tt_br;

-- ============================================================
-- 1. PRODUCER — buscar el ID real por tenant, o insertar
-- ============================================================
SELECT id INTO v_producer_id
FROM public.producers
WHERE owner_tenant_id = v_tenant_id
LIMIT 1;

IF v_producer_id IS NULL THEN
  INSERT INTO public.producers (id, owner_tenant_id, user_id, full_name, status)
  VALUES (
    'c5e93571-718d-4508-87c7-8cc0e5f6f9cd',
    v_tenant_id, v_user_id, 'Productor Test', 'active'
  )
  RETURNING id INTO v_producer_id;
ELSE
  -- Asegurar que user_id apunte al usuario correcto (requerido por resolveAccessibleUppIds)
  UPDATE public.producers
  SET user_id = v_user_id
  WHERE id = v_producer_id AND (user_id IS NULL OR user_id <> v_user_id);
END IF;

RAISE NOTICE 'producer_id = %', v_producer_id;

-- ============================================================
-- 2. UPPs — crear si no existen
-- ============================================================
INSERT INTO public.upps (id, tenant_id, producer_id, name, status)
VALUES
  (v_upp1, v_tenant_id, v_producer_id, 'Rancho La Esperanza', 'active'),
  (v_upp2, v_tenant_id, v_producer_id, 'Rancho El Sauz',      'active'),
  (v_upp3, v_tenant_id, v_producer_id, 'Rancho Los Pinos',    'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. ANIMALES — 10 bovinos distribuidos en las 3 UPPs
-- ============================================================
INSERT INTO public.animals (id, tenant_id, upp_id, siniiga_tag, sex, birth_date, status)
VALUES
  -- UPP-001: Rancho La Esperanza (4 animales)
  ('aa000001-0000-0000-0000-000000000001', v_tenant_id, v_upp1, 'MX-DUR-2022-001', 'M', '2022-03-15', 'active'),
  ('aa000001-0000-0000-0000-000000000002', v_tenant_id, v_upp1, 'MX-DUR-2021-002', 'F', '2021-06-20', 'active'),
  ('aa000001-0000-0000-0000-000000000003', v_tenant_id, v_upp1, 'MX-DUR-2023-003', 'M', '2023-01-10', 'active'),
  ('aa000001-0000-0000-0000-000000000004', v_tenant_id, v_upp1, 'MX-DUR-2020-004', 'F', '2020-08-05', 'active'),
  -- UPP-002: Rancho El Sauz (3 animales)
  ('aa000002-0000-0000-0000-000000000005', v_tenant_id, v_upp2, 'MX-DUR-2022-005', 'M', '2022-11-22', 'active'),
  ('aa000002-0000-0000-0000-000000000006', v_tenant_id, v_upp2, 'MX-DUR-2021-006', 'F', '2021-04-18', 'active'),
  ('aa000002-0000-0000-0000-000000000007', v_tenant_id, v_upp2, 'MX-DUR-2023-007', 'F', '2023-07-30', 'active'),
  -- UPP-003: Rancho Los Pinos (3 animales)
  ('aa000003-0000-0000-0000-000000000008', v_tenant_id, v_upp3, 'MX-DUR-2019-008', 'M', '2019-02-14', 'blocked'),
  ('aa000003-0000-0000-0000-000000000009', v_tenant_id, v_upp3, 'MX-DUR-2022-009', 'F', '2022-09-03', 'active'),
  ('aa000003-0000-0000-0000-000000000010', v_tenant_id, v_upp3, 'MX-DUR-2024-010', 'M', '2024-01-25', 'active')
ON CONFLICT (siniiga_tag) DO NOTHING;

-- ============================================================
-- 4. PRUEBAS SANITARIAS (field_tests)
-- ============================================================
-- test_type IDs (del SeedActual.sql):
--   TB → 7f4bb615-7ec1-40bd-85df-1b2338815cf2
--   BR → 87165c07-4c9d-4046-8e9f-6bcba9d08863
-- MVZ → b9b032e5-ec6d-49c6-ab27-ea8d3a51e12b
-- ============================================================
-- Reglas v_animals_sanitary:
--   valid_until >= CURRENT_DATE          → 'vigente'
--   valid_until >= CURRENT_DATE - 30d    → 'por_vencer'
--   valid_until <  CURRENT_DATE - 30d    → 'vencida'
-- ============================================================
INSERT INTO public.field_tests
  (id, tenant_id, animal_id, upp_id, mvz_profile_id, test_type_id, sample_date, result, valid_until)
VALUES
  -- Animal 01: TB vigente + BR vigente → EXPORTABLE ✅
  ('bb000001-0000-0000-0001-000000000001', v_tenant_id, 'aa000001-0000-0000-0000-000000000001', v_upp1, v_mvz_profile_id, v_tt_tb, '2025-09-10', 'negative', '2026-09-10'),
  ('bb000001-0000-0000-0002-000000000001', v_tenant_id, 'aa000001-0000-0000-0000-000000000001', v_upp1, v_mvz_profile_id, v_tt_br, '2025-09-10', 'negative', '2026-09-10'),
  -- Animal 02: TB vigente + BR vigente → EXPORTABLE ✅
  ('bb000002-0000-0000-0001-000000000001', v_tenant_id, 'aa000001-0000-0000-0000-000000000002', v_upp1, v_mvz_profile_id, v_tt_tb, '2025-10-05', 'negative', '2026-10-05'),
  ('bb000002-0000-0000-0002-000000000001', v_tenant_id, 'aa000001-0000-0000-0000-000000000002', v_upp1, v_mvz_profile_id, v_tt_br, '2025-10-05', 'negative', '2026-10-05'),
  -- Animal 03: TB positive → NO (positivo) ❌
  ('bb000003-0000-0000-0001-000000000001', v_tenant_id, 'aa000001-0000-0000-0000-000000000003', v_upp1, v_mvz_profile_id, v_tt_tb, '2026-01-15', 'positive',  '2027-01-15'),
  ('bb000003-0000-0000-0002-000000000001', v_tenant_id, 'aa000001-0000-0000-0000-000000000003', v_upp1, v_mvz_profile_id, v_tt_br, '2026-01-15', 'negative', '2027-01-15'),
  -- Animal 04: TB vencida (expiró hace ~70 días) → NO (prueba_vencida) ❌
  ('bb000004-0000-0000-0001-000000000001', v_tenant_id, 'aa000001-0000-0000-0000-000000000004', v_upp1, v_mvz_profile_id, v_tt_tb, '2025-01-01', 'negative', '2026-01-01'),
  ('bb000004-0000-0000-0002-000000000001', v_tenant_id, 'aa000001-0000-0000-0000-000000000004', v_upp1, v_mvz_profile_id, v_tt_br, '2025-08-20', 'negative', '2026-08-20'),
  -- Animal 05: TB vigente + BR por_vencer (expiró hace ~20 días) → NO (por_vencer) ❌
  ('bb000005-0000-0000-0001-000000000001', v_tenant_id, 'aa000002-0000-0000-0000-000000000005', v_upp2, v_mvz_profile_id, v_tt_tb, '2025-11-01', 'negative', '2026-11-01'),
  ('bb000005-0000-0000-0002-000000000001', v_tenant_id, 'aa000002-0000-0000-0000-000000000005', v_upp2, v_mvz_profile_id, v_tt_br, '2025-02-18', 'negative', '2026-02-18'),
  -- Animal 06: sin pruebas → NOT inserted here → NO (sin_pruebas) ❌
  -- Animal 07: TB vigente + BR vigente → EXPORTABLE ✅
  ('bb000007-0000-0000-0001-000000000001', v_tenant_id, 'aa000002-0000-0000-0000-000000000007', v_upp2, v_mvz_profile_id, v_tt_tb, '2025-12-01', 'negative', '2026-12-01'),
  ('bb000007-0000-0000-0002-000000000001', v_tenant_id, 'aa000002-0000-0000-0000-000000000007', v_upp2, v_mvz_profile_id, v_tt_br, '2025-12-01', 'negative', '2026-12-01'),
  -- Animal 08: BLOCKED + pruebas vigentes → NO (inactivo) ❌
  ('bb000008-0000-0000-0001-000000000001', v_tenant_id, 'aa000003-0000-0000-0000-000000000008', v_upp3, v_mvz_profile_id, v_tt_tb, '2025-08-15', 'negative', '2026-08-15'),
  ('bb000008-0000-0000-0002-000000000001', v_tenant_id, 'aa000003-0000-0000-0000-000000000008', v_upp3, v_mvz_profile_id, v_tt_br, '2025-08-15', 'negative', '2026-08-15'),
  -- Animal 09: sin TB, solo BR vigente → NO (sin_prueba TB) ❌
  ('bb000009-0000-0000-0002-000000000001', v_tenant_id, 'aa000003-0000-0000-0000-000000000009', v_upp3, v_mvz_profile_id, v_tt_br, '2025-10-20', 'negative', '2026-10-20'),
  -- Animal 10: TB vigente + BR vigente → EXPORTABLE ✅
  ('bb000010-0000-0000-0001-000000000001', v_tenant_id, 'aa000003-0000-0000-0000-000000000010', v_upp3, v_mvz_profile_id, v_tt_tb, '2026-02-01', 'negative', '2027-02-01'),
  ('bb000010-0000-0000-0002-000000000001', v_tenant_id, 'aa000003-0000-0000-0000-000000000010', v_upp3, v_mvz_profile_id, v_tt_br, '2026-02-01', 'negative', '2027-02-01')
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE 'Seed bovinos completado. 10 animales insertados en 3 UPPs.';

END $$;

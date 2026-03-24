-- ============================================================
-- migration_008_allow_multiple_mvz_profiles_per_tenant.sql
-- Permite varios perfiles MVZ por organizacion
-- ============================================================

DROP INDEX IF EXISTS public.mvz_profiles_owner_tenant_unique;

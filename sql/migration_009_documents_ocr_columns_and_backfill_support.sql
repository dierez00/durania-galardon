-- migration_009_documents_ocr_columns_and_backfill_support.sql
-- Objetivo:
-- 1) Estandarizar columnas OCR para documentos de productor y UPP.
-- 2) Permitir persistencia de texto completo y metadata OCR en ambas tablas.
-- 3) Mantener compatibilidad con columnas OCR historicas existentes.

BEGIN;

ALTER TABLE public.producer_documents
  ADD COLUMN IF NOT EXISTS full_text TEXT,
  ADD COLUMN IF NOT EXISTS ocr_fields JSONB,
  ADD COLUMN IF NOT EXISTS ocr_text TEXT,
  ADD COLUMN IF NOT EXISTS ocr_metadata JSONB;

ALTER TABLE public.upp_documents
  ADD COLUMN IF NOT EXISTS full_text TEXT,
  ADD COLUMN IF NOT EXISTS ocr_fields JSONB,
  ADD COLUMN IF NOT EXISTS ocr_text TEXT,
  ADD COLUMN IF NOT EXISTS ocr_metadata JSONB;

COMMIT;

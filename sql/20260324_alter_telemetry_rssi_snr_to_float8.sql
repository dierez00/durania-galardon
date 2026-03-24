-- 20260324_alter_telemetry_rssi_snr_to_float8.sql
ALTER TABLE public.telemetry
  ALTER COLUMN rssi TYPE float8,
  ALTER COLUMN snr  TYPE float8;